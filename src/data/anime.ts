export interface Episode {
  id: number;
  title: string;
  videoId: string;
  servers: {
    hls?: string; // m3u8 filename for HLS streaming
    helvid: string;
    hydax: string;
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

export const h264EpisodeIds: number[] = [1]; 

export const isH265Episode = (episodeId: number): boolean => {
  return !h264EpisodeIds.includes(episodeId);
};

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
      videoId: '01',
      servers: {
        hls: 'Tập1.m3u8',
        helvid: '8c8edb8924a8',
        hydax: 'AkqMUVl6B'
      },
      downloadUrl: 'https://drive.google.com/file/d/1OODRq70CsWpMVid6hejrNzIRb0l7RXEA/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/1CHh6EMCr2Lg2q76NHnUSyYClA3si0SO2/view?usp=sharing'
    },
    { 
      id: 2, 
      title: 'Episode 2', 
      videoId: '02',
      servers: {
        hls: 'Tập2.m3u8',
        helvid: 'f2daff898ca2',
        hydax: '7iGNIKWEk'
      },
      downloadUrl: 'https://drive.google.com/file/d/19dd9pWCaARRVs1kvO21-Bw5BDePiq2Kd/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/1fgCgQPckMHU1kDyUaS5DG_kVayL_dsth/view?usp=sharing'
    },
    { 
      id: 3, 
      title: 'Episode 3', 
      videoId: '03',
      servers: {
        hls: 'Tập3.m3u8',
        helvid: '50909806cf25',
        hydax: 'dibBTjuqH'
      },
      downloadUrl: 'https://drive.google.com/file/d/1tTj9xwr8Rs2KDFPMhgrBn6qj1qcY3mw_/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/1JoWzKRWLnpvwhokC_uWGjflTu9KONrfL/view?usp=sharing'
    },
    { 
      id: 4, 
      title: 'Episode 4', 
      videoId: '04',
      servers: {
        hls: 'Tập4.m3u8',
        helvid: '28b0a006506a',
        hydax: 'p_BMmjguS'
      },
      downloadUrl: 'https://drive.google.com/file/d/1EnWQNbCZvtDkB8vdvBwSsclJ4jgsjzj5/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/1n5j15eQR2umkpIW48yYz0Y5Wkm0uWNqw/view?usp=sharing'
    },
    { 
      id: 5, 
      title: 'Episode 5', 
      videoId: '05',
      servers: {
        hls: 'Tập5.m3u8',
        helvid: '136aa79ac114',
        hydax: 'cN3EniKSx'
      },
      downloadUrl: 'https://drive.google.com/file/d/18xbLTX3hUO9KvahZ9UWCRqdntZurlwm3/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/13KCpzY2jDfPxtGqE87ZuaJxL-XupXzwu/view?usp=sharing'
    },
    { 
      id: 6, 
      title: 'Episode 6', 
      videoId: '06',
      servers: {
        hls: 'Tập6.m3u8',
        helvid: 'ae8e488008c8',
        hydax: 'GDFMakAV5'
      },
      downloadUrl: 'https://drive.google.com/file/d/10POSQ7pLnmSUqicUhMSYG_wbiwKyLfFh/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/17nuFongdzfpvYlMx4ReUWduWVT8wH52C/view?usp=sharing'
    },
	{ 
      id: 7, 
      title: 'Episode 7', 
      videoId: '07',
      servers: {
        hls: 'Tập7.m3u8',
        helvid: '3d35b127f164',
        hydax: '-dOrUWexxF'
      },
      downloadUrl: 'https://drive.google.com/file/d/1u_hvxNd6kWtJluCuYwR-tNrNiOIKMKRn/view?usp=sharing',
      rawDownloadUrl: 'https://drive.google.com/file/d/1EJJljjpdwCWjiJqXr5QWbwpxZszA-wty/view?usp=sharing'
    },
      {
          id: 8,
          title: 'Episode 8',
          videoId: '08',
          servers: {
              hls: 'Tập8.m3u8',
              helvid: 'b7bf8f6a1904',
              hydax: '5JzCVvQaO'
          },
          downloadUrl: 'https://drive.google.com/file/d/1ClZN-3_xruecanTx9KZBpMGCkY8MwvL6/view?usp=sharing',
          rawDownloadUrl: 'https://drive.google.com/file/d/1F5y7-Z0yMePOvY1JY6va4AEn5JPqw_Gp/view?usp=sharing'
      },
	  {
          id: 9,
          title: 'Episode 9',
          videoId: '09',
          servers: {
              hls: 'Tập9.m3u8',
              helvid: 'ce53e6d3d73d',
              hydax: 'YGIB7e96h'
          },
          downloadUrl: 'https://drive.google.com/file/d/1V6NYHaH6kftqr8R1aSGnGnSivEMeV1EW/view?usp=sharing',
          rawDownloadUrl: 'https://drive.google.com/file/d/1e16SGgcepqkMx-tUh6qqi8XhLVRSM4tB/view?usp=sharing'
      },
	  {
          id: 10,
          title: 'Episode 10',
          videoId: '10',
          servers: {
              hls: 'Tập10.m3u8',
              helvid: 'cc9f4c5d0931',
              hydax: 'INm7KujW9'
          },
          downloadUrl: 'https://drive.google.com/file/d/1aOlCrnsNgn3kzU8H9VNoPlHjxzACRiPy/view?usp=sharing',
          rawDownloadUrl: 'https://drive.google.com/file/d/1sAZ_J3V1LY5JA13V3E-nudtsKrz7IAQL/view?usp=sharing'
      },
	  {
          id: 11,
          title: 'Episode 11',
          videoId: '11',
          servers: {
              hls: 'Tập11.m3u8',
              helvid: '57f8a054a2f1',
              hydax: '09Nwj60A6'
          },
          downloadUrl: 'https://drive.google.com/file/d/1XXCsvaBFlDzHo6l37Je-R3-t-fqLI2zI/view?usp=sharing',
          rawDownloadUrl: 'https://drive.google.com/file/d/1fW3MrcBYSztxezJ-g-_DTCFU8n4-azk0/view?usp=sharing'
      },
  ],
};
