export interface Episode {
  id: number;
  title: string;
  videoId: string;
  servers: Record<string, string>;
  downloadUrl?: string;
  rawDownloadUrl?: string;
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
  status: 'Đã Hoàn Thành' | 'Đang Tiến Hành' | 'Sắp Ra Mắt';
  episodeCount: number;
  releaseYear: number;
  studio: string;
  rating: number;
  duration: string;
  folderUrl?: string;
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
    "Tsugumi Rintaro, một nam sinh to lớn, trầm tính và có hơi “hung dữ” do vẻ ngoài của mình. Cậu tới từ trường cấp 3 Chidori, ngôi trường nam sinh cấp thấp hội tụ đủ những thành phần “bất hảo”. Bên cạnh trường của cậu là trường nữ sinh Kikyo, một trường cấp 3 vô cùng danh giá. Cậu thường xuyên bắt gặp Waguri Kaoruko, một khách hàng tại cửa hàng bánh nhà mình. Rintaro cảm thấy thoải mái khi dành thời gian bên Kaoruko. Tuy nhiên, học sinh của trường Kikyo lại cực kỳ căm ghét trường Chidori khiến mối quan hệ giữa cả hai trở nên khó xử. Đây là câu chuyện về 2 con người ở rất gần nhưng lại rất xa.", genres: ['Slice of Life', 'Romance', 'Drama', 'School Life'],
  status: 'Đã Hoàn Thành',
  episodeCount: 13,
  releaseYear: 2025,
  studio: 'CloverWorks',
  rating: 5,
  duration: '24 phút/tập',
  folderUrl: 'https://drive.google.com/file/d/1uTdYqdt0ZWvn49Y1yHWs-_NvQj5zL5Hp/view?usp=sharing',
  episodes: [
    {
      id: 1,
      title: 'Episode 1',
      videoId: '01',
      servers: {
        hls: '/kaoru-hana-01.m3u8',
        // helvid: '8c8edb8924a8',
        // hydax: 'AkqMUVl6B'
        hv:'cmpy63u4f000207nd1tcdo9ea?t=a97cc51d4ead093b828483d71a940e53cf3a6862e36c7fd02879d6e63f094094'
      },
      downloadUrl: 'https://drive.google.com/file/d/1sQth0u4dAQ2w2VdHGk_DQERCOCsNAodf/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/h20a3aq0rmtakzfdf3at6/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-1.mkv?rlkey=iuatcvtk3hzgohiv5q10y6w1m&st=8fg9ea0l&dl=0'
    },
    {
      id: 2,
      title: 'Episode 2',
      videoId: '02',
      servers: {
        hls: '/kaoru-hana-02.m3u8',
        // helvid: 'f2daff898ca2',
        // hydax: '7iGNIKWEk'
        hv:'cmpy66bjy000707nd25ydvlz3?t=11dd9a04bfc3aa6d8e5a3d5dc52342fa2130bd31ca0ed7dbb9a8409dd4e836b0'
      },
      downloadUrl: 'https://drive.google.com/file/d/1TWZMfLnDFCYq1Xu0n8jK4DhN8aCpqSwG/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/4zowypovzygk2rjyk928g/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-2.mkv?rlkey=30r0mpbe1fq86j70g3r6mjrqb&st=3avwyhx8&dl=0'
    },
    {
      id: 3,
      title: 'Episode 3',
      videoId: '03',
      servers: {
        hls: '/kaoru-hana-03.m3u8',
        // helvid: '50909806cf25',
        // hydax: 'dibBTjuqH'
        hv:'cmpy67axc000c07nd6qp7vu0r?t=56b1be11330b8bf892aa2df284e360d9856e2dafb511dfcd44d49f4a9cfb2e36'
      },
      downloadUrl: 'https://drive.google.com/file/d/1R7F61MCyGwDnqi8EpaWopH6-1FcfL1Fb/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/6a517jx34no5uwizoeot1/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-3.mkv?rlkey=yaqvfuoc1gytbxw8r64w3jnsb&st=gczc637l&dl=0'
    },
    {
      id: 4,
      title: 'Episode 4',
      videoId: '04',
      servers: {
        hls: '/kaoru-hana-04.m3u8',
        // helvid: '28b0a006506a',
        // hydax: 'p_BMmjguS',
        hv:'cmpy6936r000g07nd960qfpoj?t=c55df241e794bc19e04404aee3d85d6cfd66c27dad4b8d386926dea91cebd9cd'
      },
      downloadUrl: 'https://drive.google.com/file/d/1-23JCeopbg_O_dolzs9zFYfXzEoNuacQ/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/ma6ksc19y1xg671nhvylx/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-4.mkv?rlkey=3x61lx2z7p59aqo01ed90li3x&st=cas0zh5t&dl=0'
    },
    {
      id: 5,
      title: 'Episode 5',
      videoId: '05',
      servers: {
        hls: '/kaoru-hana-05.m3u8',
        // helvid: '136aa79ac114',
        // hydax: 'cN3EniKSx'
        hv:'cmpy6i01j000k07ndlar00a7x?t=2e5bfd3d35307e66474799041fe1f4c03d3bafbb7d6d4c740aaccaa2c1166a7f'
      },
      downloadUrl: 'https://drive.google.com/file/d/1kGbSil-omH_aWCtYvWp09rqumt2dFrVi/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/9rxci8zmo47yg9k5zdbuw/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-5.mkv?rlkey=60ix06xhxavpathtospmwt3gb&st=kptoxz3j&dl=0'
    },
    {
      id: 6,
      title: 'Episode 6',
      videoId: '06',
      servers: {
        hls: '/kaoru-hana-06.m3u8',
        // helvid: 'ae8e488008c8',
        // hydax: 'GDFMakAV5'
        hv:'cmpy6iy3o000o07ndpunfldte?t=75957f4514252d060659e60aa6d7e12b149b32b3963cc323949b3525bb9a6ed3'
      },
      downloadUrl: 'https://drive.google.com/file/d/1t7fGcYeEFOFhUQ_Flrl2cRTXYUT75Qf_/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/ac05tgc3wdfajkpojnxo4/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-6.mkv?rlkey=9drluq7iaiugtu3tiuwu9b7zc&st=sgo4xzle&dl=0'
    },
    {
      id: 7,
      title: 'Episode 7',
      videoId: '07',
      servers: {
        hls: '/kaoru-hana-07.m3u8',
        // helvid: '3d35b127f164',
        // hydax: '-dOrUWexxF'
        hv:'cmpy6kyif000s07nd1ojdlbck?t=dbe3a1835fad60940b031734c6badebb7d1300ca9cc9d992927faf304f2f13ee'
      },
      downloadUrl: 'https://drive.google.com/file/d/1-wXkJ0zwHpDFctPxETRRg8dL9RNALp7q/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/yhvclzk5je7w1azmv9tdn/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-7.mkv?rlkey=272ilzre03604d4vp9iuuu804&st=vlqrd96l&dl=0'
    },
    {
      id: 8,
      title: 'Episode 8',
      videoId: '08',
      servers: {
        hls: '/kaoru-hana-08.m3u8',
        // helvid: 'b7bf8f6a1904',
        // hydax: '5JzCVvQaO'
        hv:'cmpy6lyr0000w07nd2x22xqci?t=508b13cf0cc65fa03dec74a2f3ec91e0fe9ff11bafb295b44a26a80cb14a6c25'
      },
      downloadUrl: 'https://drive.google.com/file/d/1SMa1Ii5jO3RZIyGagMNa0PKtZuvfoF7K/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/ifpx9rt56icdw7hvd6ksm/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-8.mkv?rlkey=8krec4ra751k4hyglmdnle78z&st=kr390s2j&dl=0'
    },
    {
      id: 9,
      title: 'Episode 9',
      videoId: '09',
      servers: {
        hls: '/kaoru-hana-09.m3u8',
        // helvid: 'ce53e6d3d73d',
        // hydax: 'YGIB7e96h'
        hv:'cmpy6mtiu001007ndmwt6cnp2?t=66032d45c1558397d5ef42019cbab4c4f016ca312087f7ea77572dc122392408'
      },
      downloadUrl: 'https://drive.google.com/file/d/1ApG6zvOP2B84DOYCkA-1en9i6ENixNW_/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/aszmujhbsreid7bwdqdxy/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-9.mkv?rlkey=4bn7d7huoiwzjyhlzqjfb543f&st=w44e16h2&dl=0'
    },
    {
      id: 10,
      title: 'Episode 10',
      videoId: '10',
      servers: {
        hls: '/kaoru-hana-10.m3u8',
        // helvid: 'cc9f4c5d0931',
        // hydax: 'INm7KujW9'
        hv:'cmpy6o1sm001407ndp78orliw?t=de20f54431099017bc7635512a3b0ec3700b228a27dd94909b10a453741db7e0'
      },
      downloadUrl: 'https://drive.google.com/file/d/1Pf-_HS4RGSu2n-DaUQlKTCozhOiFVuRj/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/3iq0jlou7hyh7z3kzialj/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-10.mkv?rlkey=wbff2p94dy87b3isj6q6u7zc6&st=e7c3kwdk&dl=0'
    },
    {
      id: 11,
      title: 'Episode 11',
      videoId: '11',
      servers: {
        hls: '/kaoru-hana-11.m3u8',
        // helvid: 'bb2fee1d6943',
        // hydax: '8m8i7ojXo'
        hv:'cmpy6owlx001807nd0fahc5ds?t=86ea4c1f1ad185aa55412b0272a900c6192deeb826fdb5a6b8609de207015423'
      },
      downloadUrl: 'https://drive.google.com/file/d/19tBvqd1tIskmRaTEIa0CcNzTmuLLV--Q/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/13wz8fpenk8s868p7myr2/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-11.mkv?rlkey=0bgmorbvw8kzz4km1r738qfxc&st=tbyykp4k&dl=0'
    },
    {
      id: 12,
      title: 'Episode 12',
      videoId: '12',
      servers: {
        hls: '/kaoru-hana-12.m3u8',
        // helvid: '74304b540215',
        // hydax: 'kF3bfa3Td'
        hv:'cmpy6pnd9001c07nd17yhyaw9?t=49bae0e47e7f99e7ddcb978ad6900529c0f37e399468bb37367475f0679d672b'
      },
      downloadUrl: 'https://drive.google.com/file/d/1hy9j4zCmOviH9jtRtNPfcZDLj0nAABcB/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/i7g17ntz95w46odxt6pyo/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-12.mkv?rlkey=kejwydghdjnh1756j1var0jwe&st=a6kuyog7&dl=0'
    },
    {
      id: 13,
      title: 'Episode 13',
      videoId: '13',
      servers: {
        hls: '/kaoru-hana-13.m3u8',
        // helvid: '',
        // hydax: 'sAjv5tezT'
        hv:'cmpy6qmqs001g07ndo9qm20xs?t=bf7bb091025e6d6327f78b0f66389d000a26616550dd48f306522a3d463174ef'
      },
      downloadUrl: 'https://drive.google.com/file/d/1mp_lHTedPW0JCBbyUUFE9rLN0XMgD1x9/view?usp=sharing',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/y6w577h6pkx0l98nul95u/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-13.mkv?rlkey=rkqkj805d78znbihdvg7nk010&st=6s2mn1cn&dl=0'
    },
  ],
};
