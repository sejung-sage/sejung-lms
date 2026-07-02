#!/bin/bash
# 세정 LMS — 실 DB 적용 (Supabase 인시던트 해소 후 실행)
# psql 불필요. 프로젝트 루트에서: bash supabase/apply.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# .env.local 에서 DB 비밀번호 로드
export SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env.local | cut -d= -f2-)"

echo "1/3 마이그레이션 push..."
supabase db push --include-all --yes

echo "2/3 시드..."
node --env-file=.env.local supabase/seed.mjs

echo "3/3 완료. 이제 USE_MOCK_DB=false 로 전환 후 재배포하세요:"
echo "    - .env.local: USE_MOCK_DB=false"
echo "    - Vercel:     printf false | vercel env add USE_MOCK_DB production (preview/development 도)"
echo "    - git push (또는 vercel deploy --prod)"
