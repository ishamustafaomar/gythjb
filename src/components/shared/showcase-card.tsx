import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitFork } from 'lucide-react';
import type { ShowcaseItem } from '@/lib/showcase';
import { engine } from '@/engine';
import { useAuth } from '@/stores/auth';
import { setPendingPrompt } from '@/lib/pending-prompt';
import { startProjectFromPrompt } from '@/features/editor/generation';
import { PreviewThumbnail } from '@/components/shared/preview-thumbnail';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  // Deterministic: the same showcase entry always renders the same app.
  const files = React.useMemo(
    () => engine.createProject({ prompt: item.prompt, seed: item.id }).files,
    [item]
  );

  const remix = () => {
    if (!user) {
      setPendingPrompt(item.prompt);
      navigate('/signup?next=continue');
      return;
    }
    const projectId = startProjectFromPrompt(item.prompt);
    navigate(`/p/${projectId}`);
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative">
        <PreviewThumbnail files={files} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/25 group-hover:opacity-100">
          <Button
            size="sm"
            className="translate-y-1 bg-white text-zinc-900 shadow-overlay transition-transform duration-200 hover:bg-white/90 group-hover:translate-y-0"
            onClick={remix}
          >
            <GitFork aria-hidden />
            Remix
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2.5 border-t border-border p-3">
        <Avatar name={item.author} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground">by {item.author}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <GitFork className="size-3" aria-hidden />
          {item.remixes}
        </span>
      </div>
    </article>
  );
}
