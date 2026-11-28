import type { CrmChatId } from './crm-live-chat-rail';

export type CrmChatPropertyPayload = {
  id: string;
  name: string;
  subtitle: string;
  thumb: string;
  kind: 'rental' | 'sale';
  extraPhotos?: number;
};

export type CrmChatMessage =
  | {
      id: string;
      sender: string;
      time: string;
      type: 'text';
      text: string;
      isSelf: boolean;
      reactions?: string[];
    }
  | {
      id: string;
      sender: string;
      time: string;
      type: 'audio';
      audioDuration: string;
      isSelf: boolean;
      reactions?: string[];
    }
  | {
      id: string;
      sender: string;
      time: string;
      type: 'photos';
      photoCount: string;
      thumb?: string;
      isSelf: boolean;
      reactions?: string[];
    }
  | {
      id: string;
      sender: string;
      time: string;
      type: 'property';
      isSelf: boolean;
      property: CrmChatPropertyPayload;
      reactions?: string[];
    };

export const CRM_CHAT_OPEN_PROPERTY_KEY = 'rsv360_crm_chat_property';
export const CRM_RENTAL_FOCUS_ID_KEY = 'rsv360_crm_rental_focus';
/** '1' = rail recolhido, '0' = painel aberto (aba atual do CRM). */
export const CRM_LIVE_CHAT_COLLAPSED_KEY = 'rsv360_crm_live_chat_collapsed';
export const CRM_LIVE_CHAT_ACTIVE_ID_KEY = 'rsv360_crm_live_chat_active_id';

const CRM_CHAT_IDS = ['hollis', 'ashby', 'omar', 'nora'] as const;

export function isPersistedCrmChatId(value: string): value is CrmChatId {
  return (CRM_CHAT_IDS as readonly string[]).includes(value);
}

export function createInitialChatThreads(): Record<
  CrmChatId,
  {
    id: string;
    name: string;
    unreadBadge: number;
    avatarImg?: string;
    avatarInitials?: string;
    property: { name: string; location: string; thumb: string };
    messages: CrmChatMessage[];
  }
> {
  return {
    hollis: {
      id: 'hollis',
      name: 'Hollis',
      unreadBadge: 2,
      avatarImg: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=80&q=80',
      property: {
        name: 'Hollis Modern House',
        location: 'La Jolla · $1.24M',
        thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=120&q=80',
      },
      messages: [
        {
          id: 'm1',
          sender: 'Spencer Hale',
          time: '10:30 AM',
          type: 'audio',
          audioDuration: '1:21',
          reactions: ['👍 1', '😊 2'],
          isSelf: false,
        },
        {
          id: 'm2',
          sender: 'Jordan Ellis',
          time: '10:45 AM',
          type: 'text',
          text: 'Staging is booked for Thursday — the media room gets the dark sofa.',
          isSelf: false,
        },
        {
          id: 'm3',
          sender: 'Imani Brooks',
          time: '8:45 AM',
          type: 'photos',
          photoCount: '6 photos · 298 KB',
          thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80',
          isSelf: true,
          reactions: ['👏 2', '😋 3'],
        },
        {
          id: 'm4',
          sender: 'Spencer Hale',
          time: '9:30 AM',
          type: 'text',
          text: 'Can I see a photo of the upstairs, or other options nearby?',
          isSelf: false,
        },
      ],
    },
    ashby: {
      id: 'ashby',
      name: 'Ashby',
      unreadBadge: 0,
      avatarInitials: 'AW',
      property: {
        name: 'Cedar Ridge House',
        location: 'Julian · $1.4M',
        thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80',
      },
      messages: [
        {
          id: 'a1',
          sender: 'Ashby White',
          time: '11:15 AM',
          type: 'text',
          text: 'Hi Imani! Did the buyer submit the proof of funds for Cedar Ridge yet?',
          isSelf: false,
        },
        {
          id: 'a2',
          sender: 'Imani Brooks',
          time: '11:20 AM',
          type: 'text',
          text: 'Yes! Just reviewed the pre-approval letter and escrow deposit receipt.',
          isSelf: true,
        },
        {
          id: 'a3',
          sender: 'Ashby White',
          time: '11:32 AM',
          type: 'text',
          text: 'Perfect. We can proceed with scheduling the home inspection for Monday.',
          reactions: ['👍 1'],
          isSelf: false,
        },
      ],
    },
    omar: {
      id: 'omar',
      name: 'Omar',
      unreadBadge: 1,
      avatarImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
      property: {
        name: 'Hvar Cliff House',
        location: 'Del Mar · $3.45M',
        thumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=120&q=80',
      },
      messages: [
        {
          id: 'o1',
          sender: 'Omar Saleh',
          time: '9:10 AM',
          type: 'text',
          text: 'Good morning! We are ready to counter-offer at $3.35M with a 21-day escrow period.',
          isSelf: false,
        },
        {
          id: 'o2',
          sender: 'Henrik Dahl',
          time: '9:25 AM',
          type: 'text',
          text: 'Understood Omar. Drafting the counter-addendum now for your signature.',
          reactions: ['👌 1'],
          isSelf: false,
        },
        {
          id: 'o3',
          sender: 'Omar Saleh',
          time: '10:05 AM',
          type: 'text',
          text: 'Excellent, send it via DocuSign as soon as ready.',
          isSelf: false,
        },
      ],
    },
    nora: {
      id: 'nora',
      name: 'Nora',
      unreadBadge: 0,
      avatarImg: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80',
      property: {
        name: 'Stonebrook Cabin',
        location: 'Julian · $2,800/mo',
        thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80',
      },
      messages: [
        {
          id: 'n1',
          sender: 'Nora Whitfield',
          time: 'Yesterday',
          type: 'text',
          text: 'Hi Camila! The lease agreement looks great. Sent the security deposit via wire.',
          isSelf: false,
        },
        {
          id: 'n2',
          sender: 'Camila Duarte',
          time: 'Yesterday',
          type: 'text',
          text: 'Deposit confirmed Nora! Keys and welcome packet are scheduled for delivery Friday.',
          reactions: ['🔑 1', '❤️ 1'],
          isSelf: true,
        },
      ],
    },
  };
}
