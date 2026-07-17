import * as React from 'react';
import { Search } from 'lucide-react';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { Footer } from '@/components/layout/footer';
import { ShowcaseCard } from '@/components/shared/showcase-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SHOWCASE_PROJECTS, type ShowcaseItem } from '@/lib/showcase';
import { cn } from '@/lib/utils';

type Category = ShowcaseItem['category'];
type CategoryFilter = 'All' | Category;

const CATEGORIES: readonly CategoryFilter[] = [
  'All',
  'Website',
  'Personal',
  'Internal tools',
  'Consumer app',
];

export default function CommunityPage() {
  const [category, setCategory] = React.useState<CategoryFilter>('All');
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHOWCASE_PROJECTS.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery =
        q.length === 0 ||
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            From the community
          </h1>
          <p className="mt-3 text-muted-foreground">
            Apps and sites other builders described into existence. Browse for
            inspiration, or remix any project to make it your starting point.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap items-center gap-2"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  'h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                  category === c
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'border border-border bg-card text-muted-foreground shadow-soft hover:bg-accent hover:text-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-auto">
            <Search
              className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects by title or author"
              className="h-8 w-full pl-8 text-[13px] sm:w-56"
            />
          </div>
        </div>

        <section aria-label="Community projects" className="mt-8">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No projects match"
              description="Try another category or search term — or build the thing nobody has made yet."
            />
          ) : (
            <div
              key={category}
              className="grid animate-fade-in gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filtered.map((item) => (
                <ShowcaseCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
