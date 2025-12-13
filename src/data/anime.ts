export interface Episode {
  id: number;
  title: string;
  videoId: string;
  servers: {
    hls?: string; // m3u8 remote URL for HLS streaming
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
  dropboxFolderUrl?: string;
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
  status: 'Đã Hoàn Thành',
  episodeCount: 13,
  releaseYear: 2025,
  studio: 'CloverWorks',
  rating: 5,
  duration: '24 phút/tập',
  dropboxFolderUrl: 'https://www.dropbox.com/scl/fo/v44zfdqxh7qhkvh96osrh/AB-sI4VBpE1VqnEcCSJsFec?rlkey=l33dpsfwue2uxkih85sfzl1le&st=ydxka8aa&dl=0',
  episodes: [
    {
      id: 1,
      title: 'Episode 1',
      videoId: '01',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-1/kaoru-hana-ayaya-kana-1.m3u8',
        helvid: '8c8edb8924a8',
        hydax: 'AkqMUVl6B'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/dapvcn5dhedgn9500hsxb/Kanasub-KaoruHana-01-S01e01-Webrip-1080P-H264-E-Ac-3.mp4?rlkey=utik5zhhc4lgg5wdn6lotmsnh&st=ogc821mq&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/h20a3aq0rmtakzfdf3at6/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-1.mkv?rlkey=iuatcvtk3hzgohiv5q10y6w1m&st=8fg9ea0l&dl=0'
    },
    {
      id: 2,
      title: 'Episode 2',
      videoId: '02',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-2/kaoru-hana-ayaya-kana-2.m3u8',
        helvid: 'f2daff898ca2',
        hydax: '7iGNIKWEk'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/0rjdyv86i0ka3n9dfykg3/Kanasub-KaoruHana-02-S01e02-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=o8aq59lysaubhliezb9qxwvwb&st=h06r6o5o&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/4zowypovzygk2rjyk928g/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-2.mkv?rlkey=30r0mpbe1fq86j70g3r6mjrqb&st=3avwyhx8&dl=0'
    },
    {
      id: 3,
      title: 'Episode 3',
      videoId: '03',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-3/kaoru-hana-ayaya-kana-3.m3u8',
        helvid: '50909806cf25',
        hydax: 'dibBTjuqH'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/phwx97d4euxgfczyiw7yq/Kanasub-KaoruHana-03-S01e03-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=1xfrllu27onwqslcr7zudrj3h&st=j557pw92&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/6a517jx34no5uwizoeot1/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-3.mkv?rlkey=yaqvfuoc1gytbxw8r64w3jnsb&st=gczc637l&dl=0'
    },
    {
      id: 4,
      title: 'Episode 4',
      videoId: '04',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-4/kaoru-hana-ayaya-kana-4.m3u8',
        helvid: '28b0a006506a',
        hydax: 'p_BMmjguS'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/isy4mo2tuovpes6joathk/Kanasub-KaoruHana-04-S01e04-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=s58em2xdidndwsu2pzuugq9gm&st=ihsornkp&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/ma6ksc19y1xg671nhvylx/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-4.mkv?rlkey=3x61lx2z7p59aqo01ed90li3x&st=cas0zh5t&dl=0'
    },
    {
      id: 5,
      title: 'Episode 5',
      videoId: '05',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-5/kaoru-hana-ayaya-kana-5.m3u8',
        helvid: '136aa79ac114',
        hydax: 'cN3EniKSx'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/e3rm1o3rrob3x57epac0e/Kanasub-KaoruHana-05-S01e05-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=vghxasg3bxx3h9uppd2plo4dg&st=2spp5t8d&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/9rxci8zmo47yg9k5zdbuw/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-5.mkv?rlkey=60ix06xhxavpathtospmwt3gb&st=kptoxz3j&dl=0'
    },
    {
      id: 6,
      title: 'Episode 6',
      videoId: '06',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-6/kaoru-hana-ayaya-kana-6.m3u8',
        helvid: 'ae8e488008c8',
        hydax: 'GDFMakAV5'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/jy868htx9hxc7wov1bb7b/Kanasub-KaoruHana-06-S01e06-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=1qbktirqj2ndkuqj4hww73ewh&st=vnclf1vf&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/ac05tgc3wdfajkpojnxo4/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-6.mkv?rlkey=9drluq7iaiugtu3tiuwu9b7zc&st=sgo4xzle&dl=0'
    },
    {
      id: 7,
      title: 'Episode 7',
      videoId: '07',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-7/kaoru-hana-ayaya-kana-7.m3u8',
        helvid: '3d35b127f164',
        hydax: '-dOrUWexxF'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/z6lcyhorm54hnv6863h6p/Kanasub-Kaoruhana-07-S01e07-Webrip-1080P-H265-E-Ac-3-1.mp4?rlkey=iupvxav1k9e16mizp314p5k0w&st=2e2oi5rg&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/yhvclzk5je7w1azmv9tdn/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-7.mkv?rlkey=272ilzre03604d4vp9iuuu804&st=vlqrd96l&dl=0'
    },
    {
      id: 8,
      title: 'Episode 8',
      videoId: '08',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-8/kaoru-hana-ayaya-kana-8.m3u8',
        helvid: 'b7bf8f6a1904',
        hydax: '5JzCVvQaO'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/gta7tqabpafeck4yazkde/Kanasub-KaoruHana-08-S01e08-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=r3rfzbku3m1ssvsag1kn7f067&st=d8yt9eqp&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/ifpx9rt56icdw7hvd6ksm/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-8.mkv?rlkey=8krec4ra751k4hyglmdnle78z&st=kr390s2j&dl=0'
    },
    {
      id: 9,
      title: 'Episode 9',
      videoId: '09',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-9/kaoru-hana-ayaya-kana-9.m3u8',
        helvid: 'ce53e6d3d73d',
        hydax: 'YGIB7e96h'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/h3fpx7n9gq26ptyp2p92o/Kanasub-KaoruHana-09-S01e09-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=t9rord6orwe6h4njhx73b2b95&st=cyvfmwal&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/aszmujhbsreid7bwdqdxy/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-9.mkv?rlkey=4bn7d7huoiwzjyhlzqjfb543f&st=w44e16h2&dl=0'
    },
    {
      id: 10,
      title: 'Episode 10',
      videoId: '10',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-10/kaoru-hana-ayaya-kana-10.m3u8',
        helvid: 'cc9f4c5d0931',
        hydax: 'INm7KujW9'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/663lkbn8zuyiy2iotjvkk/Kanasub-KaoruHana-10-S01e10-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=3uehpsvvp31g61sen7ucf939z&st=vtgv4ksr&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/3iq0jlou7hyh7z3kzialj/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-10.mkv?rlkey=wbff2p94dy87b3isj6q6u7zc6&st=e7c3kwdk&dl=0'
    },
    {
      id: 11,
      title: 'Episode 11',
      videoId: '11',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-11/kaoru-hana-ayaya-kana-11.m3u8',
        helvid: 'bb2fee1d6943',
        hydax: '8m8i7ojXo'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/n8fu66paqgbcx7zkvgyg1/Kanasub-KaoruHana-11-S01e11-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=wejg8vqxin8wcvlb7sjx6rmpm&st=vq4ovh75&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/13wz8fpenk8s868p7myr2/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-11.mkv?rlkey=0bgmorbvw8kzz4km1r738qfxc&st=tbyykp4k&dl=0'
    },
    {
      id: 12,
      title: 'Episode 12',
      videoId: '12',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-12/kaoru-hana-ayaya-kana-12.m3u8',
        helvid: '74304b540215',
        hydax: 'kF3bfa3Td'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/0u2i809eva2z59y1gbvok/Kanasub-KaoruHana-12-S01e12-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=jmdzva4pe3y0fsp5c8kn2pfe0&st=ah4nnxwx&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/i7g17ntz95w46odxt6pyo/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-12.mkv?rlkey=kejwydghdjnh1756j1var0jwe&st=a6kuyog7&dl=0'
    },
    {
      id: 13,
      title: 'Episode 13',
      videoId: '13',
      servers: {
        hls: 'https://f004.backblazeb2.com/file/ayaya-kana/kaoru-hana-ayaya-kana-13/kaoru-hana-ayaya-kana-13.m3u8',
        helvid: '',
        hydax: 'sAjv5tezT'
      },
      downloadUrl: 'https://www.dropbox.com/scl/fi/te5s4myypx4f77geq5l8a/Kanasub-KaoruHana-13-S01e13-Webrip-1080P-H265-E-Ac-3.mp4?rlkey=lfliziveqntrel7sjufa3gw8z&st=5tm0oeln&dl=0',
      rawDownloadUrl: 'https://www.dropbox.com/scl/fi/y6w577h6pkx0l98nul95u/Kaoru-Hana-wa-Rin-to-Saku-Raw-T-p-13.mkv?rlkey=rkqkj805d78znbihdvg7nk010&st=6s2mn1cn&dl=0'
    },
  ],
};
