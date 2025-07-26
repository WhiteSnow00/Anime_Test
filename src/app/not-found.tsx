export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
        <p className="text-muted-foreground mb-8">Trang không tìm thấy</p>
        <a 
          href="/" 
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Về trang chủ
        </a>
      </div>
    </div>
  );
}
