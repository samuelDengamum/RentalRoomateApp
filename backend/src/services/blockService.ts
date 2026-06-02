import Block from '../models/Block';

export interface BlockRelationship {
  blockedByMe: boolean;
  blockedMe: boolean;
  eitherBlocked: boolean;
}

export const getBlockRelationship = async (currentUserId: string, otherUserId: string): Promise<BlockRelationship> => {
  const [blockedByMe, blockedMe] = await Promise.all([
    Block.exists({ blockerId: currentUserId, blockedId: otherUserId }),
    Block.exists({ blockerId: otherUserId, blockedId: currentUserId })
  ]);

  const blockedByMeBool = !!blockedByMe;
  const blockedMeBool = !!blockedMe;

  return {
    blockedByMe: blockedByMeBool,
    blockedMe: blockedMeBool,
    eitherBlocked: blockedByMeBool || blockedMeBool
  };
};

export const areUsersBlocked = async (userA: string, userB: string): Promise<boolean> => {
  const relationship = await getBlockRelationship(userA, userB);
  return relationship.eitherBlocked;
};
