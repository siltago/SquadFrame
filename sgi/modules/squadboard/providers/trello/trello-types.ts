// Shapes brutos da API do Trello — nunca expostos à UI.

export type TrelloColor =
  | "red" | "orange" | "yellow" | "green" | "blue"
  | "purple" | "pink" | "sky" | "lime" | "black" | null;

export type TrelloLabel = {
  id: string;
  name: string;
  color: TrelloColor;
  idBoard: string;
};

export type TrelloMember = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
};

export type TrelloCheckItem = {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  idChecklist: string;
  pos: number;
};

export type TrelloChecklist = {
  id: string;
  name: string;
  checkItems: TrelloCheckItem[];
  idBoard: string;
  idCard: string;
};

export type TrelloAttachmentPreview = {
  url: string;
  width: number;
  height: number;
};

export type TrelloAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  previews?: TrelloAttachmentPreview[];
  date: string;
};

export type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idBoard: string;
  due: string | null;
  dueComplete: boolean;
  labels: TrelloLabel[];
  idMembers: string[];
  members?: TrelloMember[];
  checklists?: TrelloChecklist[];
  attachments?: TrelloAttachment[];
  closed: boolean;
  pos: number;
  shortUrl?: string;
};

export type TrelloList = {
  id: string;
  name: string;
  idBoard: string;
  closed: boolean;
  pos: number;
};

export type TrelloBoard = {
  id: string;
  name: string;
  closed: boolean;
  shortUrl?: string;
};

export type TrelloAction = {
  id: string;
  type: string;
  date: string;
  data: { text?: string; [key: string]: unknown };
  memberCreator: { id: string; fullName: string; username?: string; avatarUrl: string | null };
};
