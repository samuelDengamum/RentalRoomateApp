import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;
const onlineUsers = new Set<string>();

export const setSocketServer = (server: SocketIOServer) => {
  io = server;
};

export const getSocketServer = (): SocketIOServer | null => io;

export const setUserOnline = (userId: string) => {
  onlineUsers.add(userId);
};

export const setUserOffline = (userId: string) => {
  onlineUsers.delete(userId);
};

export const isUserOnline = (userId: string): boolean => onlineUsers.has(userId);
