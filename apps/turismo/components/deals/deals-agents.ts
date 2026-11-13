export type DealAgentMeta = {
  id: string;
  name: string;
  shortName: string;
  avatarUrl: string;
};

export const DEAL_AGENT_DIRECTORY: DealAgentMeta[] = [
  {
    id: 'agent_1',
    name: 'Imani Brooks',
    shortName: 'Imani',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'agent_2',
    name: 'Jordan Ellis',
    shortName: 'Jordan',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'agent_3',
    name: 'Camila Duarte',
    shortName: 'Camila',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'agent_4',
    name: 'Henrik Dahl',
    shortName: 'Henrik',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'agent_5',
    name: 'Hana Morales',
    shortName: 'Hana',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  },
];

export function agentById(agentId: string): DealAgentMeta | undefined {
  return DEAL_AGENT_DIRECTORY.find((a) => a.id === agentId);
}
