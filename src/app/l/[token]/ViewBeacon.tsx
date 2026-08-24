"use client";

import { useEffect, useRef } from "react";
import { recordLinkView } from "./actions";

/**
 * 열람 기록용 비콘. 화면에는 아무것도 그리지 않는다.
 *
 * 열람 집계를 서버 렌더에서 하면 링크 미리보기 봇까지 세어버린다.
 * 마운트 후 한 번만 호출해서 '사람이 브라우저로 열었다'에 가깝게 만든다.
 */
export function ViewBeacon({ token }: { token: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;   // StrictMode 이중 마운트 방지
    sent.current = true;
    void recordLinkView(token);
  }, [token]);

  return null;
}
