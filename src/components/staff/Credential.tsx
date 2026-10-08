import { Message } from "@/components/omr/fields";

/** 방금 만든 계정의 임시 비밀번호 — 한 번만 보인다(어디에도 저장하지 않는다) */
export function CredentialNote({
  state,
}: {
  state: { ok: boolean; message: string; credential?: { name: string; email: string; password: string } };
}) {
  return (
    <div className="space-y-2">
      <Message ok={state.ok} message={state.message} />
      {state.credential && (
        <div className="rounded-md border border-amber-100 bg-amber-50 px-3.5 py-3 text-[13px] leading-[1.7] text-grey-800">
          <div>
            아이디 <b className="font-mono">{state.credential.email}</b>
          </div>
          <div>
            임시 비밀번호 <b className="num font-mono text-[14px]">{state.credential.password}</b>
          </div>
          <div className="text-[12px] text-amber-600">
            지금 한 번만 보여요. {state.credential.name}님께 전달해 주세요 — 첫 로그인 때 새 비밀번호로 바꿔요.
          </div>
        </div>
      )}
    </div>
  );
}
