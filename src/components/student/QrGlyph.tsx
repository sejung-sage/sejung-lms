/** 등원 QR 장식용 글리프 (목업). 실제 QR 발급은 추후 연동. */
export function QrGlyph({ className = "" }: { className?: string }) {
  // 5x5 결정적 패턴
  const p = [
    1, 1, 1, 0, 1,
    1, 0, 1, 0, 1,
    1, 1, 1, 1, 0,
    0, 0, 1, 0, 1,
    1, 1, 0, 1, 1,
  ];
  return (
    <div className={`grid grid-cols-5 gap-[2px] ${className}`}>
      {p.map((v, i) => (
        <span
          key={i}
          className={`size-1.5 rounded-[1px] ${v ? "bg-zinc-800" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}
