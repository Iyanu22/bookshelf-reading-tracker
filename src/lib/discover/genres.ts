export interface Genre {
  slug: string;
  label: string;
  /** Open Library search query. Tuned by hand: some subjects are far noisier than others. */
  query: string;
}

export const GENRES: Genre[] = [
  { slug: "fantasy", label: "Fantasy", query: 'subject:"fantasy"' },
  { slug: "science-fiction", label: "Science fiction", query: 'subject:"science fiction" -subject:fantasy' },
  { slug: "mystery", label: "Mystery", query: 'subject:"mystery fiction"' },
  { slug: "thrillers", label: "Thrillers", query: 'subject:"thriller"' },
  { slug: "romance", label: "Romance", query: 'subject:"romance"' },
  { slug: "historical-fiction", label: "Historical fiction", query: 'subject:"historical fiction"' },
  { slug: "horror", label: "Horror", query: 'subject:"horror"' },
  { slug: "african-literature", label: "African literature", query: 'subject:"african literature"' },
  { slug: "poetry", label: "Poetry", query: 'subject:"poetry"' },
  { slug: "memoir", label: "Memoir & biography", query: 'subject:"biography"' },
  { slug: "popular-science", label: "Popular science", query: 'subject:"popular science"' },
  { slug: "self-help", label: "Self-help", query: 'subject:"self-help"' },
  { slug: "programming", label: "Programming", query: 'subject:"computer programming"' },
];

export const genreBySlug = (slug: string | null) => GENRES.find((g) => g.slug === slug);
