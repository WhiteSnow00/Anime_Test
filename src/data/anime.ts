export interface Episode {
  id: number;
  title: string;
  videoId: string;
  servers: {
    hydax: string;
    mxdrop: string;
  };
  downloadUrl?: string; 
  rawDownloadUrl?: string; // For raw anime without subtitles
}

export interface Anime {
  title: string;
  alternativeTitles: {
    japanese: string;
    english: string;
  };
  posterUrl: string;
  summary: string;
  genres: string[];
  status: 'Hoàn Thành' | 'Đang Tiến Hành' | 'Sắp Ra Mắt';
  episodeCount: number;
  releaseYear: number;
  studio: string;
  rating: number; 
  duration: string;
  episodes: Episode[];
}

export const animeData: Anime = {
  title: 'Hoa Thơm Kiêu Hãnh',
  alternativeTitles: {
    japanese: '薫る花は凛と咲く',
    english: 'Kaoru Hana wa Rin to Saku',
  },
  posterUrl: '/images/kaoruhana.jpg',
  summary:
    "Tsugumi Rintaro, một nam sinh to lớn, trầm tính và có hơi “hung dữ” do vẻ ngoài của mình. Cậu tới từ trường cấp 3 Chidori, ngôi trường nam sinh cấp thấp hội tụ đủ những thành phần “bất hảo”. Bên cạnh trường của cậu là trường nữ sinh Kikyo, một trường cấp 3 vô cùng danh giá. Cậu thường xuyên bắt gặp Waguri Kaoruko, một khách hàng tại cửa hàng bánh nhà mình. Rintaro cảm thấy thoải mái khi dành thời gian bên Kaoruko. Tuy nhiên, học sinh của trường Kikyo lại cực kỳ căm ghét trường Chidori khiến mối quan hệ giữa cả hai trở nên khó xử. Đây là câu chuyện về 2 con người ở rất gần nhưng lại rất xa.",
  genres: ['Slice of Life', 'Romance', 'Drama', 'School Life'],
  status: 'Đang Tiến Hành',
  episodeCount: 13,
  releaseYear: 2025,
  studio: 'CloverWorks',
  rating: 5,
  duration: '24 phút/tập',
  episodes: [
    { 
      id: 1, 
      title: 'Episode 1', 
      videoId: 'McHS0ZLgg',
      servers: {
        hydax: 'McHS0ZLgg',
        mxdrop: 'pjm8lxzob8q387'
      },
      downloadUrl: 'https://drive.google.com/file/d/1-iRgvZnyAbOKf4470JSfNa5T9zwo5ehW/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/1CHh6EMCr2Lg2q76NHnUSyYClA3si0SO2/view?usp=sharing'
    },
  ],
};
