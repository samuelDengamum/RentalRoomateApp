import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { apiRequest } from '../lib/api';
import { API_BASE_URL, resolveMediaUrl } from '../lib/api';
import { useI18n } from '../lib/useI18n';
import '../styles/Messages.css';

interface Conversation {
  userId: string;
  participant?: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    location: string;
    userType: 'renter' | 'landlord';
    profileImage?: string;
  } | null;
  lastMessage: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface MessageItem {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  delivered?: boolean;
  read?: boolean;
  createdAt: string;
}

interface UserSearchResult {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string;
  userType: 'renter' | 'landlord';
  profileImage?: string;
}

interface ChatUserSummary {
  _id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: 'renter' | 'landlord';
  profileImage?: string;
}

interface BlockStatus {
  blocked: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
  eitherBlocked: boolean;
}

const formatUserType = (userType?: 'renter' | 'landlord') => {
  if (!userType) return 'User';
  return userType.charAt(0).toUpperCase() + userType.slice(1);
};

const UserAvatar: React.FC<{ image?: string; firstName?: string; lastName?: string }> = ({ image, firstName, lastName }) => {
  if (image) {
    return <img className="user-avatar" src={resolveMediaUrl(image)} alt={`${firstName || ''} ${lastName || ''}`.trim() || 'User avatar'} />;
  }

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  return <span className="user-avatar user-avatar-fallback">{initials}</span>;
};

const Messages: React.FC = () => {
  const { tp } = useI18n();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [messages, setMessages] = React.useState<MessageItem[]>([]);
  const [content, setContent] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<ChatUserSummary | null>(null);
  const [blockStatus, setBlockStatus] = React.useState<BlockStatus | null>(null);
  const [threadStatus, setThreadStatus] = React.useState('');
  const [myUserId, setMyUserId] = React.useState('');
  const socketRef = React.useRef<Socket | null>(null);
  const currentUserId = React.useRef<string>('');
  const selectedUserRef = React.useRef<string>('');
  const threadFromQueryApplied = React.useRef(false);

  const loadConversations = async (selfId?: string) => {
    const data = await apiRequest<Conversation[]>('/api/messages/conversations', { auth: true });
    const current = selfId || currentUserId.current;
    setConversations(current ? data.filter((item) => item.userId !== current) : data);
    window.dispatchEvent(new Event('messages:updated'));
  };

  const resolveSelectedUser = async (userId: string) => {
    if (userId === currentUserId.current) {
      setSelectedUser(null);
      return;
    }

    const fromConversation = conversations.find((item) => item.userId === userId)?.participant;
    if (fromConversation) {
      setSelectedUser(fromConversation);
      return;
    }

    const fromSearch = searchResults.find((item) => item._id === userId);
    if (fromSearch) {
      setSelectedUser(fromSearch);
      return;
    }

    try {
      const user = await apiRequest<ChatUserSummary>(`/api/auth/users/${userId}`, { auth: true });
      setSelectedUser(user);
    } catch {
      setSelectedUser(null);
    }
  };

  const loadBlockStatus = async (userId: string) => {
    try {
      const status = await apiRequest<BlockStatus>(`/api/reports/block/${userId}`, { auth: true });
      setBlockStatus(status);
    } catch {
      setBlockStatus(null);
    }
  };

  const loadThread = async (userId: string) => {
    if (!userId || userId === currentUserId.current) {
      return;
    }

    let threadMessages: MessageItem[] = [];

    try {
      threadMessages = await apiRequest<MessageItem[]>(`/api/messages/${userId}`, { auth: true });
      setMessages(threadMessages);
      setThreadStatus('');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.toLowerCase().includes('blocked')) {
        setMessages([]);
        setThreadStatus(errorMessage);
      } else {
        throw error;
      }
    }

    setSelectedUserId(userId);
    await resolveSelectedUser(userId);
    await loadBlockStatus(userId);
    selectedUserRef.current = userId;

    const unread = threadMessages.filter(
      (msg) => msg.receiverId === currentUserId.current && !msg.read
    );
    await Promise.all(
      unread.map((msg) =>
        apiRequest(`/api/messages/${msg._id}/read`, { method: 'PUT', auth: true })
      )
    );
    await loadConversations();
  };

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { userId: string };
      currentUserId.current = payload.userId;
      setMyUserId(payload.userId);
      loadConversations(payload.userId);
      const socket = io(API_BASE_URL, {
        query: { userId: payload.userId }
      });

      socket.on('message:new', (incoming: MessageItem) => {
        const isActiveThread =
          selectedUserRef.current &&
          [incoming.senderId, incoming.receiverId].includes(selectedUserRef.current) &&
          [incoming.senderId, incoming.receiverId].includes(currentUserId.current);

        if (isActiveThread) {
          setMessages((prev) => [...prev, incoming]);
        }

        loadConversations();
      });

      socket.on('message:status', (status: { messageId: string; delivered: boolean; read: boolean }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === status.messageId
              ? { ...msg, delivered: status.delivered, read: status.read }
              : msg
          )
        );
      });

      socket.on('message:read', ({ messageId }: { messageId: string }) => {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, delivered: true, read: true } : msg))
        );
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Socket setup failed', error);
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // Initialize socket once after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const preselectedUserId = searchParams.get('userId');
    if (!preselectedUserId || preselectedUserId === currentUserId.current || threadFromQueryApplied.current) return;

    threadFromQueryApplied.current = true;
    loadThread(preselectedUserId).catch((error) => {
      console.error('Failed to open preselected conversation', error);
    });
    // Intentionally only reacts to URL query updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !content.trim() || blockStatus?.eitherBlocked) return;

    try {
      await apiRequest('/api/messages', {
        method: 'POST',
        auth: true,
        body: { receiverId: selectedUserId, content }
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      setThreadStatus(errorMessage);
      if (errorMessage.toLowerCase().includes('blocked')) {
        await loadBlockStatus(selectedUserId);
      }
      return;
    }

    setContent('');
    setThreadStatus('');
    await loadThread(selectedUserId);
    await loadConversations();
  };

  const handleBlock = async () => {
    if (!selectedUserId) return;

    await apiRequest(`/api/reports/block/${selectedUserId}`, {
      method: 'POST',
      auth: true
    });

    setThreadStatus(tp('You blocked this user. You can unblock anytime.'));
    await loadBlockStatus(selectedUserId);
    await loadConversations();
  };

  const handleUnblock = async () => {
    if (!selectedUserId) return;

    await apiRequest(`/api/reports/block/${selectedUserId}`, {
      method: 'DELETE',
      auth: true
    });

    setThreadStatus(tp('User unblocked. Messaging is available again.'));
    await loadBlockStatus(selectedUserId);
    await loadConversations();
  };

  const searchUsers = async () => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const users = await apiRequest<UserSearchResult[]>(`/api/auth/users/search?q=${encodeURIComponent(search)}`, {
      auth: true
    });
    setSearchResults(users.filter((user) => user._id !== currentUserId.current));
  };

  return (
    <section className="messages-wrap">
      <aside className="messages-sidebar glass">
        <h2>{tp('Conversations')}</h2>
        <div className="search-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tp('Search users')} />
          <button onClick={searchUsers}>{tp('Find')}</button>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((user) => (
              <button key={user._id} onClick={() => loadThread(user._id)} className="user-chip">
                <div className="user-card-row">
                  <UserAvatar image={user.profileImage} firstName={user.firstName} lastName={user.lastName} />
                  <div className="user-card-meta">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <small>@{user.username} • {tp(formatUserType(user.userType))}</small>
                    <p className="muted">{user.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="conversation-list">
          {conversations.map((conv) => (
            <button key={conv.userId} onClick={() => loadThread(conv.userId)} className="conversation-item">
              {conv.participant ? (
                <div className="user-card-row">
                  <UserAvatar
                    image={conv.participant.profileImage}
                    firstName={conv.participant.firstName}
                    lastName={conv.participant.lastName}
                  />
                  <div className="user-card-meta">
                    <strong>{conv.participant.firstName} {conv.participant.lastName}</strong>
                    <small>@{conv.participant.username} • {tp(formatUserType(conv.participant.userType))}</small>
                    <p className="muted">{conv.participant.email}</p>
                    <p className="muted">{conv.lastMessage?.content}</p>
                  </div>
                </div>
              ) : (
                <p>User ID: {conv.userId.slice(0, 8)}...</p>
              )}
              {conv.unreadCount > 0 && <span className="badge">{conv.unreadCount}</span>}
            </button>
          ))}
        </div>
      </aside>

      <section className="messages-thread glass">
        {selectedUserId ? (
          <header className="thread-header">
            <div className="user-card-row">
              <UserAvatar image={selectedUser?.profileImage} firstName={selectedUser?.firstName} lastName={selectedUser?.lastName} />
              <div className="user-card-meta">
                <strong>{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : tp('Loading user...')}</strong>
                {selectedUser ? (
                  <small>@{selectedUser.username} • {tp(formatUserType(selectedUser.userType))}</small>
                ) : null}
                {selectedUser ? <p className="muted">{selectedUser.email}</p> : null}
              </div>
            </div>

            {selectedUser ? (
              <div className="thread-actions">
                {blockStatus?.blockedByMe ? (
                  <button type="button" className="block-btn block-btn--outline" onClick={handleUnblock}>
                    {tp('Unblock user')}
                  </button>
                ) : (
                  <button type="button" className="block-btn" onClick={handleBlock}>
                    {tp('Block user')}
                  </button>
                )}
              </div>
            ) : null}
          </header>
        ) : (
          <h2>{tp('Select a conversation')}</h2>
        )}
        {threadStatus ? <p className="thread-status">{threadStatus}</p> : null}
        {blockStatus?.blockedMe ? (
          <p className="thread-status">{tp('This user has blocked you. You cannot send messages in this conversation.')}</p>
        ) : null}
        <div className="thread-messages">
          {messages.map((msg) => (
            <article
              key={msg._id}
              className={`message-row ${msg.senderId === myUserId ? 'mine' : 'theirs'} reveal`}
            >
              <div className={`message-bubble ${msg.senderId === myUserId ? 'mine' : 'theirs'}`}>
              <p>{msg.content}</p>
              <small>
                {new Date(msg.createdAt).toLocaleString()}
                {msg.senderId === myUserId && (
                  <span className={`ticks ${msg.read ? 'read' : msg.delivered ? 'delivered' : 'sent'}`}>
                    {msg.read ? '✓✓' : msg.delivered ? '✓✓' : '✓'}
                  </span>
                )}
              </small>
              </div>
            </article>
          ))}
        </div>

        <form className="compose" onSubmit={handleSend}>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={blockStatus?.eitherBlocked ? tp('Messaging disabled due to block status') : tp('Write a message...')}
            disabled={!selectedUserId || !!blockStatus?.eitherBlocked}
          />
          <button type="submit" disabled={!selectedUserId || !!blockStatus?.eitherBlocked}>{tp('Send')}</button>
        </form>
      </section>
    </section>
  );
};

export default Messages;
