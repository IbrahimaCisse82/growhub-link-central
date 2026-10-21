import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Smile, AtSign, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀", "👀", "✅", "🔥", "💯", "🤔", "👏", "🙏"];

type PendingFile = {
  file: File;
  preview?: string;
};

type Props = {
  onSend: (content: string, attachments?: { file_name: string; file_url: string; file_size: number; file_type: string }[], mentionIds?: string[]) => void;
  onTyping: () => void;
  placeholder?: string;
  disabled?: boolean;
  members?: { user_id: string; full_name: string }[];
};

export default function MessageInput({ onSend, onTyping, placeholder = "Écrire un message…", disabled, members = [] }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();

  const handleChange = (val: string) => {
    setContent(val);

    // Typing indicator
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onTyping();
    typingTimeout.current = setTimeout(() => {}, 3000);

    // Mention detection
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0) {
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(" ") && afterAt.length <= 20) {
        setShowMentions(true);
        setMentionFilter(afterAt.toLowerCase());
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (name: string) => {
    const lastAt = content.lastIndexOf("@");
    setContent(content.slice(0, lastAt) + `@${name} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []).map(f => ({
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));
    setFiles(prev => [...prev, ...newFiles].slice(0, 10));
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = useCallback(async () => {
    if (!content.trim() && files.length === 0) return;
    if (files.length > 0 && !userId) { toast.error("Session expirée, reconnectez-vous"); return; }
    setUploading(true);

    try {
      // Upload files
      const uploadedAttachments: { file_name: string; file_url: string; file_size: number; file_type: string }[] = [];
      for (const pf of files) {
        // La politique de dépôt exige un premier dossier = identifiant de l'utilisateur.
        const safeName = pf.file.name.replace(/[^\w.-]+/g, "_");
        const path = `${userId}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("message-attachments").upload(path, pf.file);
        if (error) { toast.error(`Erreur upload: ${pf.file.name}`); continue; }
        // Espace privé : on stocke le chemin, l'affichage passe par une URL signée.
        uploadedAttachments.push({
          file_name: pf.file.name,
          file_url: path,
          file_size: pf.file.size,
          file_type: pf.file.type,
        });
      }

      // Extract mention user IDs
      const mentionNames = content.match(/@(\w+)/g)?.map(m => m.slice(1)) ?? [];
      const mentionIds = members
        .filter(m => mentionNames.some(name => m.full_name.toLowerCase().includes(name.toLowerCase())))
        .map(m => m.user_id);

      onSend(content, uploadedAttachments.length > 0 ? uploadedAttachments : undefined, mentionIds.length > 0 ? mentionIds : undefined);
      setContent("");
      setFiles([]);
      setShowEmoji(false);
    } finally {
      setUploading(false);
    }
  }, [content, files, members, onSend, userId]);

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(mentionFilter)
  ).slice(0, 8);

  return (
    <div className="border-t border-border bg-card">
      {/* File previews */}
      {files.length > 0 && (
        <div className="flex gap-2 px-4 pt-2 flex-wrap">
          {files.map((pf, i) => (
            <div key={i} className="relative group">
              {pf.preview ? (
                <img src={pf.preview} className="w-16 h-16 object-cover rounded-lg border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-border bg-secondary flex items-center justify-center text-[10px] text-muted-foreground text-center p-1 leading-tight">
                  {pf.file.name.slice(0, 12)}
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention suggestions */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="mx-4 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {filteredMembers.map(m => (
            <button
              key={m.user_id}
              onClick={() => insertMention(m.full_name.split(" ")[0])}
              className="w-full px-3 py-2 text-left text-[12.5px] text-foreground hover:bg-secondary flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {m.full_name.charAt(0).toUpperCase()}
              </div>
              {m.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="mx-4 mb-1 p-2 bg-card border border-border rounded-lg shadow-lg flex flex-wrap gap-1 w-fit">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => { setContent(prev => prev + e); setShowEmoji(false); inputRef.current?.focus(); }} className="p-1.5 hover:bg-secondary rounded text-lg">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <button onClick={() => fileRef.current?.click()} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <Paperclip className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={addFile} />

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            rows={1}
            className="w-full rounded-xl border border-input bg-secondary px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none min-h-[40px] max-h-[120px]"
            placeholder={placeholder}
            disabled={disabled || uploading}
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
        </div>

        <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          <Smile className="w-4 h-4" />
        </button>

        <button
          onClick={handleSend}
          disabled={(!content.trim() && files.length === 0) || uploading || disabled}
          className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
