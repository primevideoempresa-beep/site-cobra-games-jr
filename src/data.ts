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
  },
  {
    id: "cobra-racing-3d",
    title: "Cobra Racing 3D",
    stats: "Gráficos de Última Geração em 3D",
    category: "Corrida",
    isFeatured: true,
    image: "/src/assets/images/cobra_racing_3d_banner_1794435318487.jpg",
    iframeUrl: "/cobraracing3d/index.html"
  }
];

