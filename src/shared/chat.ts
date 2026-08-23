export type MessageSender = "system" | "user" | "admin" | "stranger";
export type MessageViewer = "user" | "admin";
export type MessageSide = "system" | "me" | "them";

export type Message = {
  id: string;
  sender: MessageSender;
  text: string;
  tone?: "default" | "danger";
};

export function messageSide(sender: MessageSender, viewer: MessageViewer): MessageSide {
  if (sender === "system") return "system";
  if (viewer === "admin") return sender === "admin" ? "me" : "them";
  return sender === "user" ? "me" : "them";
}
