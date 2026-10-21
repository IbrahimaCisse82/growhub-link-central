import { useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChannelMessage, ReactionGroup, Attachment } from "@/hooks/useMessaging";
import { MessageSquare, Smile, Pin, MoreHorizontal, Pencil, Trash2, Download } from "lucide-react";
import SignedDownloadLink, { useSignedUrl } from "@/components/shared/SignedDownloadLink";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀", "👀", "✅", "🔥"];

type Props = {
  message: ChannelMessage;
  senderName: string;
  senderAvatar: string | null;
  isOnline: boolean;
  reactions: ReactionGroup[];
  attachments: Attachment[];
  isMine: boolean;
  isPinned: boolean;
  onReact: (emoji: string) => void;
  onThreadOpen: () => void;
  onPin: () => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
};

export default function MessageBubble({
  message, senderName, senderAvatar, isOnline, reactions, attachments,
  isMine, isPinned, onReact, onThreadOpen, onPin, onEdit, onDelete,
}: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(editContent.trim());
    }
    setEditing(false);
  };

  // Render mentions: @username pattern
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="bg-primary/20 text-primary rounded px-0.5 font-medium">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };


  return (
    <div className={`group flex gap-2.5 px-4 py-1.5 hover:bg-secondary/50 transition-colors ${isPinned ? "border-l-2 border-primary/50" : ""}`}>
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
          {senderAvatar ? (
            <img src={senderAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            senderName.charAt(0).toUpperCase()
          )}
        </div>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] font-bold text-foreground">{senderName}</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {format(new Date(message.created_at), "HH:mm", { locale: fr })}
          </span>
          {message.is_edited && <span className="text-[9px] text-muted-foreground italic">(modifié)</span>}
          {isPinned && <Pin className="w-3 h-3 text-primary inline" />}
        </div>

        {/* Message body */}
        {editing ? (
          <div className="mt-1">
            <textarea
              ref={inputRef}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button onClick={handleSaveEdit} className="text-[11px] text-primary font-medium">Enregistrer</button>
              <button onClick={() => setEditing(false)} className="text-[11px] text-muted-foreground">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {attachments.map(a => <AttachmentItem key={a.id} attachment={a} />)}
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                  r.reacted
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-mono text-[10px]">{r.count}</span>
              </button>
            ))}
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="flex items-center px-1.5 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            >
              <Smile className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Thread indicator */}
        {message.reply_count > 0 && (
          <button onClick={onThreadOpen} className="flex items-center gap-1.5 mt-1 text-primary text-[11px] font-medium hover:underline">
            <MessageSquare className="w-3 h-3" />
            {message.reply_count} réponse{message.reply_count > 1 ? "s" : ""}
            {message.last_reply_at && (
              <span className="text-muted-foreground font-mono text-[9px]">
                · {format(new Date(message.last_reply_at), "HH:mm")}
              </span>
            )}
          </button>
        )}

        {/* Quick emoji popup */}
        {showEmoji && (
          <div className="flex gap-1 mt-1 p-1 bg-card border border-border rounded-lg shadow-lg w-fit">
            {QUICK_EMOJIS.map(e => (
              <button key={e} onClick={() => { onReact(e); setShowEmoji(false); }} className="p-1 hover:bg-secondary rounded text-base">
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 mt-0.5">
        <button onClick={() => setShowEmoji(!showEmoji)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
          <Smile className="w-3.5 h-3.5" />
        </button>
        <button onClick={onThreadOpen} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={onPin}>
              <Pin className="w-3.5 h-3.5 mr-2" /> {isPinned ? "Désépingler" : "Épingler"}
            </DropdownMenuItem>
            {isMine && (
              <>
                <DropdownMenuItem onClick={() => { setEditing(true); setEditContent(message.content); }}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function fileIcon(type: string | null) {
  if (!type) return "📄";
  if (type.startsWith("image/")) return "🖼️";
  if (type.includes("pdf")) return "📕";
  if (type.includes("spreadsheet") || type.includes("excel")) return "📊";
  if (type.includes("presentation") || type.includes("powerpoint")) return "📽️";
  return "📄";
}

/** Pièce jointe d'un espace privé : image pré-signée, fichier signé au clic. */
function AttachmentItem({ attachment: a }: { attachment: Attachment }) {
  const isImage = a.file_type?.startsWith("image/");
  const imageUrl = useSignedUrl("message-attachments", isImage ? a.file_url : null);
  if (isImage) {
    return (
      <SignedDownloadLink bucket="message-attachments" pathOrUrl={a.file_url} className="block rounded-lg overflow-hidden border border-border max-w-[250px] hover:opacity-80 transition-opacity">
        {imageUrl
          ? <img src={imageUrl} alt={a.file_name} className="max-h-[180px] object-cover" />
          : <div className="h-[120px] w-[200px] bg-secondary animate-pulse" />}
        <div className="px-2 py-1 text-[10px] text-muted-foreground truncate">{a.file_name}</div>
      </SignedDownloadLink>
    );
  }
  return (
    <SignedDownloadLink bucket="message-attachments" pathOrUrl={a.file_url} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
      <span className="text-lg">{fileIcon(a.file_type)}</span>
      <div className="min-w-0">
        <div className="text-[11.5px] font-medium text-foreground truncate max-w-[180px]">{a.file_name}</div>
        {a.file_size && <div className="text-[9px] text-muted-foreground">{(a.file_size / 1024).toFixed(0)} KB</div>}
      </div>
      <Download className="w-3.5 h-3.5 text-muted-foreground" />
    </SignedDownloadLink>
  );
}
