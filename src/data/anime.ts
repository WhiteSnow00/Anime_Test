export interface Episode {
  id: number;
  title: string;
  videoId: string;
  servers: {
    name: string;
    videoUrl: string;
    note: string;
  }[];
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
  status: "Hoàn Thành" | "Đang Tiến Hành" | "Sắp Ra Mắt";
  episodeCount: number;
  releaseYear: number;
  studio: string;
  rating: number;
  duration: string;
  episodes: Episode[];
}

export const h264EpisodeIds: number[] = [1, 2];

export const isH265Episode = (episodeId: number): boolean => {
  return !h264EpisodeIds.includes(episodeId);
};

export const serverConfig = {
  hls: {
    name: "HLS Stream",
    label: "HD Quality",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  helvid: {
    name: "Helvid",
    label: "HD Fast",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  hydax: {
    name: "Hydax",
    label: "HD Backup",
    color: "bg-green-500 hover:bg-green-600",
  },
};

export const animeData: Anime = {
  title: "Hoa Thơm Kiêu Hãnh",
  alternativeTitles: {
    japanese: "薫る花は凛と咲く",
    english: "Kaoru Hana wa Rin to Saku",
  },
  posterUrl: "/images/kaoruhana.jpg",
  summary:
    "Tsugumi Rintaro, một nam sinh to lớn, trầm tính và có hơi “hung dữ” do vẻ ngoài của mình. Cậu tới từ trường cấp 3 Chidori, ngôi trường nam sinh cấp thấp hội tụ đủ những thành phần “bất hảo”. Bên cạnh trường của cậu là trường nữ sinh Kikyo, một trường cấp 3 vô cùng danh giá. Cậu thường xuyên bắt gặp Waguri Kaoruko, một khách hàng tại cửa hàng bánh nhà mình. Rintaro cảm thấy thoải mái khi dành thời gian bên Kaoruko. Tuy nhiên, học sinh của trường Kikyo lại cực kỳ căm ghét trường Chidori khiến mối quan hệ giữa cả hai trở nên khó xử. Đây là câu chuyện về 2 con người ở rất gần nhưng lại rất xa.",
  genres: ["Slice of Life", "Romance", "Drama", "School Life"],
  status: "Đang Tiến Hành",
  episodeCount: 13,
  releaseYear: 2025,
  studio: "CloverWorks",
  rating: 5,
  duration: "24 phút/tập",
  episodes: [
    {
      id: 1,
      title: "Episode 1",
      videoId: "01",
      servers: [
        { name: "HLS", videoUrl: "/m3u8/tap-1.m3u8", note: "HD Quality" },
        {
          name: "Helvid",
          videoUrl: "https://helvid.net/play/index/8c8edb8924a8",
          note: "HD Fast",
        },
        {
          name: "Hydrax",
          videoUrl: "https://abysscdn.com/?v=AkqMUVl6B",
          note: "HD Backup",
        },
      ],
      downloadUrl:
        "https://drive.google.com/file/d/1OODRq70CsWpMVid6hejrNzIRb0l7RXEA/view?usp=sharing",
      rawDownloadUrl:
        "https://drive.google.com/file/d/1CHh6EMCr2Lg2q76NHnUSyYClA3si0SO2/view?usp=sharing",
    },
    {
      id: 2,
      title: "Episode 2",
      videoId: "02",
      servers: [
        { name: "HLS", videoUrl: "/m3u8/tap-2.m3u8", note: "HD Quality" },
        {
          name: "Helvid",
          videoUrl: "https://helvid.net/play/index/f2daff898ca2",
          note: "HD Fast",
        },
        {
          name: "Hydrax",
          videoUrl: "https://abysscdn.com/?v=7iGNIKWEk",
          note: "HD Backup",
        },
      ],
      downloadUrl:
        "https://drive.google.com/file/d/19dd9pWCaARRVs1kvO21-Bw5BDePiq2Kd/view?usp=sharing",
      rawDownloadUrl:
        "https://drive.google.com/file/d/1fgCgQPckMHU1kDyUaS5DG_kVayL_dsth/view?usp=sharing",
    },
    {
      id: 3,
      title: "Episode 3",
      videoId: "03",
      servers: [
        { name: "HLS", videoUrl: "/m3u8/tap-3.m3u8", note: "HD Quality" },
        {
          name: "Helvid",
          videoUrl: "https://helvid.net/play/index/50909806cf25",
          note: "HD Fast",
        },
        {
          name: "Hydrax",
          videoUrl: "https://abysscdn.com/?v=dibBTjuqH",
          note: "HD Backup",
        },
      ],
      downloadUrl:
        "https://drive.google.com/file/d/1tTj9xwr8Rs2KDFPMhgrBn6qj1qcY3mw_/view?usp=sharing",
      rawDownloadUrl:
        "https://drive.google.com/file/d/1JoWzKRWLnpvwhokC_uWGjflTu9KONrfL/view?usp=sharing",
    },
    {
      id: 4,
      title: "Episode 4",
      videoId: "04",
      servers: [
        { name: "HLS", videoUrl: "/m3u8/tap-4.m3u8", note: "HD Quality" },
        {
          name: "Helvid",
          videoUrl: "https://helvid.net/play/index/28b0a006506a",
          note: "HD Fast",
        },
        {
          name: "Hydrax",
          videoUrl: "https://abysscdn.com/?v=p_BMmjguS",
          note: "HD Backup",
        },
      ],
      downloadUrl:
        "https://drive.google.com/file/d/1EnWQNbCZvtDkB8vdvBwSsclJ4jgsjzj5/view?usp=sharing",
      rawDownloadUrl:
        "https://drive.google.com/file/d/1n5j15eQR2umkpIW48yYz0Y5Wkm0uWNqw/view?usp=sharing",
    },
  ],
};
