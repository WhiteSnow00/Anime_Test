export default function CommentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {children}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Quản lý bình luận - Hoa Thơm Kiêu Hãnh',
  description: 'Trang quản lý bình luận cho các tập phim',
};
