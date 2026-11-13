export interface GameData {
  id: string;
  title: string;
  stats: string;
  category: string;
  image?: string;
  icon?: string;
  isFeatured?: boolean;
  isUnderMaintenance?: boolean;
  maintenanceMessage?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
  iframeUrl?: string;
}

export const otherGames: GameData[] = [
  { 
    id: "cobra-pro-max",
    title: "Cobra Pro Max — Cobra Faminta", 
    stats: "Mais de 500 milhões de downloads", 
    category: "Ação", 
    isFeatured: true,
    image: "/assets/aistudio/icone_d2367d66.webp",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.aistudio.cobrapromax.game",
    iframeUrl: "/cobra-pro-max.html"
  }
];

