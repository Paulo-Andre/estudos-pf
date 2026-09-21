#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT_HEADERS="$(mktemp)"
STUDENT_HEADERS="$(mktemp)"
ROOT_COOKIE=""
STUDENT_COOKIE=""
STUDENT_ID=""
STUDENT_USERNAME="alunoe2e$(date +%s)"
STUDENT_PASSWORD="teste-local-e2e-2026"

cleanup() {
  if [[ -n "$STUDENT_ID" && -n "$ROOT_COOKIE" ]]; then
    curl --silent --show-error --header 'content-type: application/json' --header "Cookie: $ROOT_COOKIE" \
      --request POST --data "{\"json\":{\"userId\":$STUDENT_ID,\"confirmationUsername\":\"$STUDENT_USERNAME\"}}" \
      "$BASE_URL/api/trpc/admin.deleteUser" >/dev/null || true
  fi
  if [[ -n "$STUDENT_COOKIE" ]]; then
    curl --silent --show-error --header 'content-type: application/json' --header "Cookie: $STUDENT_COOKIE" \
      --request POST --data '{"json":null}' "$BASE_URL/api/trpc/auth.logout" >/dev/null || true
  fi
  if [[ -n "$ROOT_COOKIE" ]]; then
    curl --silent --show-error --header 'content-type: application/json' --header "Cookie: $ROOT_COOKIE" \
      --request POST --data '{"json":null}' "$BASE_URL/api/trpc/auth.logout" >/dev/null || true
  fi
  rm -f "$ROOT_HEADERS" "$STUDENT_HEADERS"
}
trap cleanup EXIT

cookie_from_headers() {
  grep -im1 '^set-cookie:' "$1" | sed -E 's/^[Ss]et-[Cc]ookie:[[:space:]]*//; s/;.*$//'
}

test -n "${ROOT_INITIAL_PASSWORD:-}"

ROOT_LOGIN=$(curl --silent --show-error --dump-header "$ROOT_HEADERS" --header 'content-type: application/json' \
  --request POST --data "{\"json\":{\"identifier\":\"paulo\",\"password\":\"${ROOT_INITIAL_PASSWORD}\"}}" \
  "$BASE_URL/api/trpc/auth.login")
printf '%s' "$ROOT_LOGIN" | grep -q '"role":"admin"'
ROOT_COOKIE="$(cookie_from_headers "$ROOT_HEADERS")"
test -n "$ROOT_COOKIE"

ROOT_STUDY=$(curl --silent --show-error --header "Cookie: $ROOT_COOKIE" \
  "$BASE_URL/api/trpc/study.state?input=%7B%22json%22%3Anull%7D")
printf '%s' "$ROOT_STUDY" | grep -q '"result"'
printf '%s\n' 'PASS: ROOT acessa study.state sem matrícula.'

STUDENT_REGISTER=$(curl --silent --show-error --dump-header "$STUDENT_HEADERS" --header 'content-type: application/json' \
  --request POST --data "{\"json\":{\"name\":\"Aluno de Validação\",\"username\":\"$STUDENT_USERNAME\",\"email\":\"$STUDENT_USERNAME@exemplo.test\",\"password\":\"$STUDENT_PASSWORD\",\"passwordConfirmation\":\"$STUDENT_PASSWORD\"}}" \
  "$BASE_URL/api/trpc/auth.register")
STUDENT_ID="$(printf '%s' "$STUDENT_REGISTER" | sed -n 's/.*"id":\([0-9][0-9]*\).*/\1/p' | head -n 1)"
test -n "$STUDENT_ID"
STUDENT_COOKIE="$(cookie_from_headers "$STUDENT_HEADERS")"
test -n "$STUDENT_COOKIE"

BLOCKED=$(curl --silent --show-error --header "Cookie: $STUDENT_COOKIE" \
  "$BASE_URL/api/trpc/study.state?input=%7B%22json%22%3Anull%7D")
printf '%s' "$BLOCKED" | grep -q 'FORBIDDEN'
printf '%s\n' 'PASS: aluno sem matrícula é bloqueado pelo servidor.'

COURSES=$(curl --silent --show-error --header "Cookie: $ROOT_COOKIE" \
  "$BASE_URL/api/trpc/admin.courses?input=%7B%22json%22%3Anull%7D")
COURSE_ID="$(printf '%s' "$COURSES" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n 1)"
test -n "$COURSE_ID"
START_AT="$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S.000Z)"
EXPIRES_AT="$(date -u -d '30 days' +%Y-%m-%dT%H:%M:%S.000Z)"
GRANT=$(curl --silent --show-error --header 'content-type: application/json' --header "Cookie: $ROOT_COOKIE" \
  --request POST --data "{\"json\":{\"userId\":$STUDENT_ID,\"courseId\":\"$COURSE_ID\",\"startAt\":\"$START_AT\",\"expiresAt\":\"$EXPIRES_AT\"}}" \
  "$BASE_URL/api/trpc/admin.grantEnrollment")
printf '%s' "$GRANT" | grep -qv '"error"'

ALLOWED=$(curl --silent --show-error --header "Cookie: $STUDENT_COOKIE" \
  "$BASE_URL/api/trpc/study.state?input=%7B%22json%22%3Anull%7D")
printf '%s' "$ALLOWED" | grep -q '"result"'
printf '%s\n' 'PASS: aluno com matrícula vigente recebe acesso ao estudo.'
