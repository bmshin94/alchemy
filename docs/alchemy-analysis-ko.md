# Alchemy 전수조사 분석 정리 (한국어)

> 작성일: 2026-10-01
> 분석 대상 레포: **https://github.com/bmshin94/alchemy** (fork)
> 원본(upstream): **https://github.com/alchemy-run/alchemy**
> 공식 문서: **https://alchemy.run**
> 분석 기준 버전: `2.0.0-beta.79` / 라이선스: Apache-2.0

---

## 목차

1. [이게 뭐하는 레포인가](#1-이게-뭐하는-레포인가)
2. [쉬운 비유로 이해하기](#2-쉬운-비유로-이해하기)
3. [Q&A — 설치/정체성/토큰/AI에이전트/React·PHP/유튜브](#3-qa)
4. [수익화 아이디어 상세](#4-수익화-아이디어-상세)
5. [리스크 및 결론](#5-리스크-및-결론)

---

## 1. 이게 뭐하는 레포인가

### 한 줄 정의

**Alchemy** = **Infrastructure-as-Effects (IaE)** 프레임워크.
Terraform / Pulumi / AWS CDK 계열의 **인프라 자동화(IaC) 도구**이면서,
YAML·전용 DSL 없이 **TypeScript 한 개 프로그램 안에서
"클라우드 자원 선언 + 그 위에서 돌아가는 애플리케이션 코드"를 동시에** 작성한다.

- 기반 기술: [Effect](https://effect.website) (TypeScript 함수형 런타임)
- 만든 사람: Sam Goodwin (`sam@alchemy.run`)
- 상태: **알파/베타** — "Expect breaking changes" 공식 명시

### 규모 (실측)

| 항목 | 수치 |
|---|---|
| 소스 `.ts` 파일 (`packages/alchemy/src`) | **8,549개** |
| 소스 코드 줄 수 | **896,963 줄** |
| 테스트 파일 | **1,715개** (실제 클라우드에 진짜 배포해 검증) |
| 리소스 타입 선언 (`Resource<T>("...")`) | **492개** |
| 바인딩 관련 파일 (`Binding.Service`) | **2,990개** |
| AWS 서비스 폴더 | **210개** |
| Cloudflare 서비스 폴더 | **98개** |
| 실행 가능한 예제 프로젝트 | **121개** (`alchemy.run.ts` 보유 120개) |

### 폴더 구조

```
alchemy/
├── packages/                     # 실제 라이브러리 (9개 패키지)
│   ├── alchemy/                  # ★ 본체
│   │   ├── src/
│   │   │   ├── AWS/              # 210개 서비스 (S3, Lambda, DynamoDB, EC2, ECS, EKS, Bedrock…)
│   │   │   ├── Cloudflare/       # 98개 서비스 (Workers, R2, D1, KV, Queues, DO, Containers…)
│   │   │   ├── Stripe/           # 153개 파일 (결제/구독/Connect)
│   │   │   ├── Railway/ (70) Fly/ (68) Hetzner/ (35) GitHub/ (26)
│   │   │   ├── Neon/ Planetscale/ Docker/ Kubernetes/ Redis/ AI/
│   │   │   ├── Cli/              # deploy, dev, destroy, logs, drift, nuke, state, profile
│   │   │   ├── Local/            # 로컬 에뮬레이션 (alchemy dev)
│   │   │   ├── State/            # 배포 상태 저장소 (플러그형)
│   │   │   └── 엔진 코어: Plan.ts Apply.ts Diff.ts Deploy.ts Destroy.ts
│   │   │                  Resource.ts Provider.ts Binding.ts Stack.ts Output.ts
│   │   └── test/                 # 1,715개 라이브 클라우드 테스트
│   ├── alchemy-test/             # 자체 제작 Effect 네이티브 테스트 러너 (vitest 호환)
│   ├── better-auth/              # Better Auth 인증 통합
│   ├── cloudflare-runtime/       # Workers 로컬 런타임 + 번들러 플러그인
│   ├── frontend-frameworks/      # Next/Nuxt/Astro/SvelteKit/TanStack 빌드 통합
│   ├── floci/                    # 로컬 AWS 에뮬레이터 매니저 (Docker)
│   └── node-utils/ pkg/ cloudflare-test-tools/
├── examples/                     # ★ 121개 실행 가능한 예제
├── website/                      # 공식 문서 사이트 (Astro + Starlight)
├── submodules/
│   ├── distilled/                # 자동생성 Effect SDK (클라우드 API 타입)
│   └── floci/                    # AWS 로컬 에뮬레이터 포크
├── scripts/                      # 코드생성·문서생성·테스트자동화
├── stacks/                       # 자체 운영 스택 (github, otel, nuke, pkg)
├── action.yml                    # GitHub Action (main→prod, PR→프리뷰, PR닫힘→삭제)
├── AGENTS.md                     # ★ 97KB AI 에이전트용 개발 지침서
└── CLAUDE.md                     # AGENTS.md 로드 + 카리나 페르소나(이 포크에서 추가)
```

### 핵심 개념 5가지

| 개념 | 설명 |
|---|---|
| **Stack** | 배포 단위. Effect 프로그램 하나. 리소스를 yield하고 출력값을 반환 |
| **Resource** | 버킷·DB·큐·Worker 같은 클라우드 자원. **492종** 구현 |
| **Binding** | 🔑 최대 차별점. 한 줄로 ①바인딩 등록 ②환경변수/IAM 자동생성 ③타입 안전 런타임 클라이언트 반환 |
| **Provider** | 리소스 생명주기 구현체: `diff` / `read` / `reconcile` / `delete` |
| **Stage** | `dev`, `prod`, `staging-123` 등 격리 환경. 같은 코드, 다른 환경 |

### 대표 코드

```typescript
// src/api.ts — 버킷 선언과 그 버킷을 쓰는 Worker가 한 파일에
export const Uploads = Cloudflare.R2.Bucket("Uploads");

export default Cloudflare.Worker(
  "Api",
  { main: import.meta.url },
  Effect.gen(function* () {
    const bucket = yield* Cloudflare.R2.ReadWriteBucket(Uploads); // ← 바인딩 한 줄
    return {
      fetch: Effect.gen(function* () {
        const obj = yield* bucket.get("hello.txt");
        return obj
          ? HttpServerResponse.text(yield* obj.text())
          : HttpServerResponse.text("Not found", { status: 404 });
      }),
    };
  }).pipe(Effect.provide(Cloudflare.R2.ReadWriteBucketBinding)),
);
```

```bash
bun alchemy deploy   # 버킷 생성 + Worker 번들 + 바인딩 연결 + URL 출력
```

### CLI 명령어

| 명령 | 역할 |
|---|---|
| `alchemy deploy` | 계획 표시 → 승인 → 배포 |
| `alchemy dev` | 로컬 에뮬레이션 (workerd/Docker로 R2·KV·D1 로컬 구동) |
| `alchemy destroy` | 스택 전체 삭제 |
| `alchemy drift` | 실제 클라우드 ↔ 코드 차이 검사 |
| `alchemy logs` / `tail` | 실시간 로그 |
| `alchemy state` | 상태 조회/수정 |
| `alchemy profile` | 인증 프로파일 관리 (OAuth / API 토큰) |
| `alchemy nuke` | 계정 내 alchemy 태그 자원 전부 삭제 |

### 타 도구와 비교

| | Terraform | Pulumi | AWS CDK | **Alchemy** |
|---|---|---|---|---|
| 언어 | HCL | TS/Py/Go | TS/Py | **TypeScript** |
| 앱 코드 통합 | ❌ 별도 | ❌ 별도 | ❌ 별도 | ✅ **같은 프로그램** |
| 에러 처리 | 런타임 실패 | 런타임 실패 | 런타임 실패 | ✅ **타입에 에러 포함** |
| 바인딩/IAM | 수동 | 수동 | 일부 자동 | ✅ **한 줄 자동** |
| 상태 저장 | S3/Cloud | Pulumi Cloud | CloudFormation | ✅ 로컬/R2/D1 선택 |
| 로컬 개발 | ❌ | ❌ | 제한적 | ✅ `alchemy dev` |

### 내게 주는 이점

1. 클라우드 인프라를 **TypeScript만으로** 다룸 (HCL/YAML 불필요)
2. **121개 예제가 즉시 보일러플레이트** (Next.js를 CF/AWS/Fly/Hetzner/Railway에 올리는 예제 전부 존재)
3. **97KB `AGENTS.md`** = 멀티 AI 에이전트 운영 방법론 레퍼런스 (에이전트 12대 병렬로 Cloudflare 리소스 36→239개 확장 사례 문서화)
4. **PR 프리뷰 환경 자동화**를 `action.yml` 하나로
5. **Stripe 153개 파일** → SaaS 결제/구독을 코드로 관리
6. **Apache-2.0** → 상업적 이용·수정·재배포 가능

---

## 2. 쉬운 비유로 이해하기

### 집 짓기 비유

**기존 방식**: 종이 3장 (설계도 `.tf` / 배선표 `wrangler.toml` / 가구배치 `앱 코드`)
→ "거실"을 "리빙룸"으로 바꾸면 3장 모두 손으로 수정. 하나 빼먹으면 **배포 후에야** 터진다.

**Alchemy 방식**: 종이 1장
→ 이름을 바꾸면 **TypeScript 컴파일러가 배포 전에** 빨간 줄로 잡아준다.

### 바인딩 = "멀티탭 자동 설치 기사"

```typescript
const bucket = yield* Cloudflare.R2.ReadWriteBucket(Uploads);
```

이 한 줄이 기사님에게 시키는 일:
1. 창고 열쇠 복사해 앱에게 전달 → **환경변수 주입**
2. 경비실에 출입 허가 등록 → **IAM 정책 / CF 바인딩 생성**
3. 앱 손에 리모컨 쥐어주기 → **타입 완성된 클라이언트 객체**

기존엔 이 3개를 전부 수동으로 했고, 그래서 "환경변수 이름 오타"로 밤을 새운다.

### "타입에 에러가 들어있다"

```typescript
// 일반 코드 — 뭐가 터질지 모름
const obj = await bucket.get("a.txt");   // 404? 권한? 네트워크?

// Alchemy(Effect) — 가능한 에러가 타입에 명시됨
const obj = yield* bucket.get("a.txt");
// 타입: Effect<Object, BucketNotFound | AccessDenied | NetworkError>
// → 처리 안 하면 컴파일 에러. 빼먹을 수 없다.
```

음료 라벨에 "뜨거움/차가움/탄산"이 전부 적혀 있는 것과 같다.

### 스테이지 = "같은 무대, 다른 공연"

```bash
alchemy deploy                     # dev_$USER (개인 놀이터)
alchemy deploy --stage prod        # 실서비스
alchemy deploy --stage staging-42  # PR #42 전용 임시 환경
```

코드 한 벌로 완전 격리된 환경 N개. `dev`에서 DB를 날려도 `prod`는 무사하다.

### 폴더를 "가게"로 비유

| 폴더 | 비유 |
|---|---|
| `packages/alchemy/src/` | 본점 창고 — 492종 상품 재고 |
| `src/AWS/`, `src/Cloudflare/` | 브랜드별 코너 (210 / 98 매대) |
| `examples/` (121개) | 샘플 전시장 — 완제품 121종 |
| `website/` | 설명서 코너 |
| `packages/alchemy/test/` (1,715개) | 품질검사실 — 실제 클라우드에 배포해 검사 |
| `AGENTS.md` (97KB) | 직원 교육 매뉴얼 (AI 직원용) |
| `submodules/distilled/` | 부품 자동생산 공장 (API 타입 코드생성) |

### 쉬운 말로 짚는 한계

- **베타다** (`2.0.0-beta.79`). 브레이킹 체인지 전제.
- **Effect를 배워야 한다.** `yield*`, `Layer`, `pipe` — 진입장벽 중 가장 큰 요소.
- **Bun 권장** (Node 22+도 동작하나 Bun이 1급 시민).
- 커뮤니티가 Terraform보다 작아 검색으로 나오는 답이 적다.

---

## 3. Q&A

### Q1. 설치 및 사용법?

```bash
# 0) 사전 준비: Bun + Cloudflare 계정(무료 플랜 충분)
curl -fsSL https://bun.sh/install | bash

# 1) 프로젝트
mkdir my-app && cd my-app && bun init -y

# 2) 설치
bun add alchemy@latest effect@rc @effect/platform-bun @effect/platform-node
```

> `effect@rc`로 고정해야 한다. Alchemy가 Effect RC API(`Effect.result`, `effect/unstable/http` 등)를 사용한다.

**인증** (환경변수 불필요가 기본):

```bash
alchemy profile edit --add Cloudflare       # OAuth 브라우저 로그인 또는 API 토큰 입력
# 저장 위치: ~/.alchemy/profiles.json

alchemy profile create prod                 # 프로파일 분리
alchemy profile edit --profile prod
alchemy deploy --profile prod --stage prod
```

**첫 스택**:

```typescript
// alchemy.run.ts
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
  "MyApp",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const bucket = yield* Cloudflare.R2.Bucket("Bucket");
    return { bucketName: bucket.bucketName };
  }),
);
```

**실행**: `bun alchemy deploy` / `dev` / `destroy` / `drift` / `logs`

**추천 학습 순서**
1. https://alchemy.run/what-is-alchemy (2분 개요)
2. https://alchemy.run/getting-started (첫 배포)
3. 5부작 튜토리얼 `/cloudflare/tutorial/part-1` ~ `part-5`
4. `examples/` 중 목적에 가까운 폴더 복사 후 수정 ← 실무상 가장 빠름
5. https://alchemy.run/llms.txt — AI에게 문서 인덱스 주입용

### Q2. 플러그인? 스킬? MCP?

**셋 다 아니다. 독립적인 npm 라이브러리 + CLI 도구다.**

| 구분 | 여부 | 근거 |
|---|---|---|
| Claude 플러그인 | ❌ | `.claude-plugin/`, `plugin.json` 없음 |
| Claude 스킬 | ❌ | `.claude/skills/` 없음 |
| MCP 서버 | ❌ | MCP 서버 구현 없음 |
| **npm 패키지 + CLI** | ✅ | `bin: { alchemy: "./bin/cli.js" }` |
| GitHub Action | ✅ (부가) | 루트 `action.yml` |

**혼동하기 쉬운 이유** — 이 레포는 "AI 에이전트가 읽고 작업하도록" 설계됐다:
- `AGENTS.md` 97KB — AI 에이전트 개발 규칙서 (에이전트는 `tsc` 금지, 코디네이터만 타입체크, 동시 12대 등)
- `CLAUDE.md` → `@AGENTS.md` 로드
- `llms.txt` 제공
- README에 "AI 코딩 에이전트로 부트스트랩" 프롬프트 수록

→ 정답: **"MCP/스킬이 아니라, AI 에이전트가 잘 쓰도록 만들어진 일반 라이브러리"**.
이를 감싸 **MCP 서버 / Claude 스킬로 만드는 것은 가능하고, 그 자체가 수익화 기회다**(4장 아이디어 4번).

### Q3. API 토큰을 써야 하나?

**로컬 개발**: OAuth 또는 API 토큰 중 선택. `~/.alchemy/profiles.json`에 저장. **환경변수 필수 아님**.

**CI/CD**: 토큰 필수.

```yaml
- uses: alchemy-run/alchemy@v1
  env:
    CLOUDFLARE_ACCOUNT_ID: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

| 프로바이더 | 필요 자격증명 |
|---|---|
| Cloudflare | OAuth(권장) 또는 API Token + Account ID |
| AWS | SSO / Access Key / IAM Role |
| GitHub | PAT 또는 GitHub App |
| Stripe | Secret Key |
| Neon / Planetscale / Fly / Railway / Hetzner | 각 서비스 API Key |

특이사항: `*Http` 바인딩 구현체(`BucketReadHttp.ts` 등)는 필요한 권한 그룹만 가진 `AccountApiToken`을 **런타임에 자동 발급**해 Worker에 주입한다 — 최소권한 원칙이 코드에 내장돼 있다.

### Q4. AI 에이전트 구축에 도움이 될까?

**결론: 인프라 레이어로는 최상급. 단, 에이전트 "두뇌(LLM 루프)"는 직접 붙여야 한다.**

**도움되는 점**

| 에이전트 요구사항 | Alchemy 리소스 |
|---|---|
| 대화 상태 유지 | Cloudflare **Durable Objects** (에이전트 1개 = DO 1개) |
| 벡터 DB / RAG | Cloudflare Vectorize |
| LLM 호출 + 캐싱 + 레이트리밋 | Cloudflare **AI Gateway**, Workers AI, AWS Bedrock |
| 장기 작업 오케스트레이션 | Cloudflare **Workflows** (중단/재개) |
| 코드 실행 샌드박스 | Cloudflare **Containers**, `cloudflare-microvm-shell` 예제 |
| 파일/아티팩트 | R2, S3 |
| 메모리 / 구조화 DB | D1, KV, Neon, Planetscale |
| 작업 큐 | Queues, SQS |
| 스케줄 | Cron Triggers |
| 관측 | Axiom, OTEL (`stacks/otel.ts`) |

`examples/cloudflare-agent`에 실물 패턴 존재 — 프롬프트 템플릿 리터럴에 툴을 임베드하면 타입이 의존성을 추론한다:

```typescript
export const cmd = AI.Parameter("cmd")(S.String.pipe(S.optional))`The command to run.`;

export const Bash = AI.Tool("bash")`
Run a shell ${cmd} and return its stdout, stderr, and exit code.`(
  Effect.fn(function* ({ cmd }) { /* 구현 */ }),
);

export class ReleaseBlogger extends Alchemy.Agent<ReleaseBlogger>()("Blogger")`
You are the Release Blogger...
1. Use the ${Grep} tool to find the most recent post...
4. Use the ${WriteFile} tool to create the new post...
` {}
```

**주의 — 실측 확인된 한계**

`packages/alchemy/src/AI/Agent.ts`의 에이전트 본체는 **아직 미완성**이다:

```typescript
const makeAgent = (name, template, refs) =>
  Object.assign(
    effectClass(Effect.gen(function* () {
      // TODO(sam): implement the agent      ← 실제 LLM 루프 미구현
    })),
    ...
```

`src/AI/` 폴더는 `Agent.ts`, `Tool.ts`, `Parameter.ts`, `index.ts` 4개 파일뿐이다.

- ✅ 인프라 / 배포 / 바인딩 → 즉시 사용 가능
- ❌ LLM 호출 루프, tool-calling 파이프라인 → Anthropic SDK / Vercel AI SDK / LangGraph 등을 직접 결합
- 🎯 권장: **Alchemy = 인프라+배포 / AI SDK = 두뇌**

**추천 아키텍처**

```
[ Alchemy로 선언·배포 ]
  Cloudflare Worker (HTTP 엔드포인트)
    ↕ 바인딩 한 줄로 연결
  Durable Object  ← 대화 세션 상태
  Vectorize       ← RAG 검색
  AI Gateway      ← LLM 캐싱/레이트리밋
  R2 / D1         ← 파일 / 메모리
  Workflows       ← 장기 작업
  Container       ← 코드 실행 샌드박스
        ↑ 두뇌 탑재
  Anthropic SDK / Vercel AI SDK / LangGraph
```

### Q5. React / PHP로 만들 수 있나?

**React → 완전 가능. 사실상 1급 지원.**

`examples/`에 프레임워크 × 클라우드 조합 예제가 대량 존재:

```
cloudflare-website-nextjs        aws-website-nextjs          fly-website-nextjs
cloudflare-website-react-router  aws-website-react-router    hetzner-website-react-router
cloudflare-website-tanstack-start  cloudflare-tanstack-rpc-drizzle
cloudflare-website-vite  cloudflare-vue  cloudflare-solidjs-ssr
+ Astro, Nuxt, SvelteKit, SolidStart, Waku, Vocs, Foldkit
× Cloudflare / AWS / Fly / Hetzner / Railway / Prisma
```

전용 패키지: `packages/frontend-frameworks`

```typescript
const db = yield* Cloudflare.D1.Database("Db");
const site = yield* Cloudflare.Website("Site", {
  command: "vite build",   // React 빌드
  assets: "./dist",
});
```

`cloudflare-tanstack-rpc-drizzle` 예제는 React ↔ RPC ↔ Drizzle ↔ D1 전 구간 타입 안전을 보여준다.

**PHP → 구분해서 봐야 한다.**

| 목적 | 가능 여부 | 방법 |
|---|---|---|
| Alchemy 자체를 PHP로 작성 | ❌ 불가 | TypeScript/Effect 전용, PHP 포트 없음 |
| PHP 앱을 Alchemy로 **배포** | ✅ 가능 | Docker 이미지화 → Fly / Railway / Hetzner / AWS ECS |
| Cloudflare Workers에서 PHP 실행 | ❌ 사실상 불가 | Workers는 JS/WASM 런타임 |

```typescript
const image   = yield* Docker.Image("php-app", { context: "./", dockerfile: "Dockerfile" });
const app     = yield* Fly.App("laravel-app");
const machine = yield* Fly.Machine("web", { app, image });
// 또는 Hetzner.Server / Railway.Service / AWS.ECS.Service
```

참고 예제: `docker-postgres`, `fly-service`, `railway-service`, `hetzner-server`

### Q6. 유튜브 강의 영상 제작 가능할까?

**결론: 가능하고 기회가 크다. 단 전략이 필요하다.**

**유리한 점**
1. **한국어 콘텐츠 사실상 제로** → 선점 효과
2. 시각적 임팩트 (코드 30줄 → `deploy` → 실제 URL)
3. 비교 서사 명확 ("Terraform은 파일 3개, Alchemy는 1개")
4. 공식 5부작 튜토리얼이 그대로 커리큘럼
5. 예제 121개 → 소재 고갈 없음
6. IaC + 서버리스 + 함수형 + AI 키워드 교차 유입

**리스크와 대응**

| 리스크 | 대응 |
|---|---|
| 베타 API 변경 | 영상 설명란에 버전 명시 + 코드 저장소 운영 |
| Effect 진입장벽 | "Effect 기초" 선행 시리즈 분리 (조회수 2배 효과) |
| 틈새 주제 | 결과물 중심 제목 ("Cloudflare에 AI 에이전트 배포하기") |
| 영어권 경쟁 | 한국어 + 국내 결제/클라우드/문화 특화 |

**추천 커리큘럼 (시즌 1, 12편)**

| # | 제목 | 길이 | 비고 |
|---|---|---|---|
| 0 | Terraform 없이 TS로 인프라 짜는 시대 | 8분 | 훅 영상 |
| 1 | 설치 + 첫 R2 버킷 5분 배포 | 12분 | 빠른 성취감 |
| 2 | Effect 최소 지식 (yield*, Layer, pipe) | 20분 | 장벽 해소 |
| 3 | Worker + R2 바인딩 = 파일 서버 | 15분 | 바인딩 시연 |
| 4 | D1 + Drizzle 풀스택 CRUD | 20분 | |
| 5 | React(TanStack Start) 배포 + 타입안전 RPC | 25분 | 조회수 핵심 |
| 6 | `alchemy dev` 로컬 개발 환경 | 12분 | |
| 7 | Durable Objects 실시간 채팅 | 20분 | |
| 8 | AI 챗봇 에이전트 배포 (DO + AI Gateway) | 30분 | 최고 인기 예상 |
| 9 | GitHub Actions PR 프리뷰 자동화 | 18분 | 실무 임팩트 |
| 10 | Stripe 결제로 SaaS 만들기 | 25분 | 수익화 관심층 |
| 11 | AWS Lambda + S3 + DynamoDB 편 | 25분 | AWS 시청자 흡수 |

**파생 수익**: 인프런/유데미 유료 강의, 템플릿 판매, 기업 자문·세미나, 뉴스레터 멤버십

라이선스: **Apache-2.0** → 강의·상업적 이용 가능. 코드 인용 시 출처 표기 권장.

---

## 4. 수익화 아이디어 상세

> 평가 기준: 난이도 × 수익규모 × 소요시간

### TIER 1 — 즉시 시작 가능

#### 1. 한국어 교육 콘텐츠 비즈니스 ⭐ 최우선

| 항목 | 내용 |
|---|---|
| 난이도 | ⭐⭐☆☆☆ |
| 초기비용 | 거의 0원 (Cloudflare 무료 플랜) |
| 수익 시점 | 1~3개월 |
| 예상 수익 | 유튜브 월 30~300만 / 인프런 강의 1개당 월 50~500만 |

실행 단계
1. 유튜브 12편 한국어 시리즈 무료 공개 → 신뢰·구독자 확보
2. 유료 심화 강의 ("Alchemy로 SaaS 처음부터 배포까지", 인프런/유데미)
3. 뉴스레터 → 멤버십(월 9,900원): 코드 저장소 + Q&A + 베타 변경사항 알림
4. 번들: 강의 + 템플릿 + 1:1 코드리뷰 = 29만원

1등 이유: 한국어 경쟁자 0 + 재고 없음 + **다른 모든 수익화의 입구**(강의→신뢰→템플릿 판매→외주 유입)

#### 2. 프리미엄 템플릿 / 보일러플레이트 판매

| 항목 | 내용 |
|---|---|
| 난이도 | ⭐⭐☆☆☆ |
| 수익 시점 | 2~4주 |
| 예상 수익 | $49~$199 × 월 10~50건 = 월 60~600만원 |

| 템플릿 | 구성 | 가격 |
|---|---|---|
| **AI SaaS Starter** | Worker + DO(세션) + AI Gateway + D1 + Stripe 구독 + Better Auth + React | $149 |
| **Korean SaaS Kit** | 위 + 토스페이먼츠/포트원 + 카카오 로그인 + 한국어 UI | $199 |
| **AI 에이전트 플랫폼** | DO + Vectorize(RAG) + Workflows + Container 샌드박스 | $199 |
| Multi-tenant B2B | 테넌트별 D1/R2 격리 + 조직 관리 | $179 |
| PR 프리뷰 인프라 키트 | GitHub Action + 스테이지 자동생성/삭제 | $79 |

차별점: Alchemy는 인프라까지 코드에 포함 → 구매자가 `deploy` 한 번으로 **전체 인프라 생성**을 체험. 기존 "코드만 주는" 템플릿과 격이 다르다.
채널: Gumroad, LemonSqueezy, 자체 사이트(Alchemy로 만들면 그 자체가 데모)

#### 3. 프리랜싱 / 기술 컨설팅

| 항목 | 내용 |
|---|---|
| 난이도 | ⭐⭐⭐☆☆ |
| 수익 시점 | 1~2개월 (포트폴리오 확보 후) |
| 예상 수익 | 프로젝트당 500~3,000만원 |

- "AWS 비용 70% 절감" — Lambda/EC2 → Cloudflare Workers 마이그레이션 (Alchemy가 양쪽을 지원해 **점진적 이전** 가능)
- Terraform/Pulumi → Alchemy 전환 컨설팅
- 스타트업 인프라 셋업 패키지 (고정가 800만원)
- IaC 도입 사내 교육 (1일 워크샵 300만원)

영업 포인트: "인프라+앱이 한 프로그램 → 유지보수 인력 절반"

### TIER 2 — 중기

#### 4. Alchemy MCP 서버 / Claude 스킬 (숨은 보석)

| 항목 | 내용 |
|---|---|
| 난이도 | ⭐⭐⭐☆☆ |
| 수익 시점 | 1~2개월 |
| 예상 수익 | OSS 명성 → 간접 수익 大 / Pro 티어 월 $19 |

```
alchemy-mcp
├── alchemy_plan        배포 계획 조회
├── alchemy_deploy      승인 게이트 후 배포
├── alchemy_drift       드리프트 검사
├── alchemy_cost        예상 비용 산정
├── alchemy_search_docs llms.txt 기반 문서 검색
└── alchemy_scaffold    121개 예제 기반 스캐폴딩
```
+ Claude 스킬 "Alchemy Expert" (AGENTS.md 재가공)

수익 모델: 무료 OSS로 신뢰 자산 확보 → 1·2·3번 매출 증폭 / Pro(팀 상태 공유, 비용 분석, 배포 승인 워크플로, 월 $19/시트) / 기업판

근거: AI 코딩 에이전트 시장 급성장 + "에이전트가 인프라를 안전하게 배포"는 미해결 영역. Alchemy는 이미 `plan → 승인 → apply` 구조 보유.

#### 5. Alchemy Cloud — 관리형 상태저장소 + 대시보드

| 항목 | 내용 |
|---|---|
| 난이도 | ⭐⭐⭐⭐☆ |
| 수익 시점 | 4~8개월 |
| 예상 수익 | 월 $19~99/팀 × 100팀 = 월 250~1,200만원 MRR |

Pulumi Cloud / Terraform Cloud의 Alchemy 버전. `src/State/`가 플러그형이고 `custom-state-store.mdx` 문서까지 존재.
기능: 팀 상태 공유+락, 배포 히스토리/롤백, 드리프트 알림, RBAC, 비용 추적, PR 프리뷰 대시보드
리스크: 원작자 선점 가능성 → **한국/아시아 리전 + 한국어 지원 + 국내 결제**로 지역 특화

#### 6. 틈새 수직 SaaS 직접 구축 (수익 상한 최고)

Alchemy를 **제품이 아니라 도구로** 쓰는 전략.

| 아이디어 | Alchemy 이점 | 가격 |
|---|---|---|
| AI 고객상담 봇 서비스 | 테넌트별 DO+Vectorize 격리를 코드로 자동 프로비저닝 | 월 5~50만 |
| 이미지/영상 변환 API | R2 + Workers + Containers | 사용량 과금 |
| 웹훅 라우터/릴레이 | Queues + DO + D1 | 월 2~10만 |
| 크론 모니터링 | Cron Triggers + DO + 알림 | 월 1~5만 |
| 스테이징 환경 as-a-Service | PR 프리뷰 자동화가 Alchemy 킬러 기능 | 월 10~100만 |

결정적 이점: 고객 가입 시 `deploy --stage customer-123` 한 줄로 **격리 인프라 프로그램적 생성** → 멀티테넌시가 공짜로 따라온다.

### TIER 3 — 장기 / 하이리스크

#### 7. 프로바이더 확장 → 유료 플러그인

현재 지원: AWS, Cloudflare, Fly, Hetzner, Railway, Neon, Planetscale, Stripe, GitHub, Docker, Kubernetes, Redis, Axiom

미지원 중 한국 수요:
- **네이버 클라우드 / NHN Cloud / 카카오클라우드** ← 국내 기업 수요 확실, 경쟁 0
- Azure / GCP
- 토스페이먼츠 / 포트원(아임포트) 결제 프로바이더
- Supabase, Upstash, Clerk

수익: OSS 공개(생태계 신뢰) + 기업 지원계약, 또는 상업 라이선스

#### 8. 교육 플랫폼 / 부트캠프 모듈
"서버리스 + IaC + Effect" 4주 집중 과정. 1인 150만 × 15명 = 회차당 2,250만원

#### 9. 기업용 내부 개발자 플랫폼(IDP) 구축 대행
Alchemy 코어로 사내 셀프서비스 인프라 포털 구축. 프로젝트 5,000만~2억

#### 10. 콘텐츠 + 에코시스템 미디어
Alchemy/Effect/Cloudflare 생태계 뉴스레터 → 스폰서십 (편당 $500~2,000)

### 추천 로드맵

```
[0~3개월] 씨앗 뿌리기
├─ 유튜브 12편 한국어 시리즈 (무료)
├─ alchemy-mcp 오픈소스 공개 → 깃허브 스타 확보
└─ 기술 블로그 10편
   목표: 신뢰 자산 + 구독자 1,000명

[3~6개월] 수익화 시작
├─ 유료 강의 1개 출시 (인프런)
├─ 템플릿 2개 판매 (AI SaaS Kit, Korean SaaS Kit)
└─ 프리랜싱 1~2건
   목표: 월 300~800만원

[6~18개월] 확장
├─ 수직 SaaS 1개 런칭
├─ MCP Pro 티어 오픈
└─ 기업 컨설팅 / 교육 정례화
   목표: 월 1,000만원+ / MRR 구축
```

---

## 5. 리스크 및 결론

| 리스크 | 심각도 | 대응 |
|---|---|---|
| 베타 → API 변경 | 🔴 높음 | 버전 고정 + 유지보수 비용 가격 반영 + 업데이트 서비스화 |
| Effect 학습곡선 → 시장 축소 | 🟠 중간 | "Effect 없이 쓰는 법" 콘텐츠로 장벽 낮추기 |
| 원작자 상업화 선점 | 🟠 중간 | 지역 특화(한국) + 교육/템플릿 레이어 포지셔닝 |
| 생태계 규모가 Terraform 대비 작음 | 🟡 낮음 | 신규 프로젝트·스타트업 타겟 (레거시 이전 아님) |
| 1인 의존 프로젝트 | 🟠 중간 | Apache-2.0 → 최악의 경우 포크 가능. 핵심 수익이 "지식·콘텐츠"라 도구가 바뀌어도 자산 유지 |

### 결론

- Alchemy는 **IaC + 애플리케이션 런타임을 하나의 타입 안전한 TypeScript 프로그램으로 통합**한 프레임워크다. 바인딩 한 줄로 환경변수·IAM·타입 클라이언트가 동시에 해결되는 것이 최대 차별점이다.
- 플러그인/스킬/MCP가 **아니다**. npm 라이브러리 + CLI이며, 그 위에 MCP·스킬을 얹을 여지가 열려 있다.
- AI 에이전트 **인프라 레이어로는 매우 강하지만**, `src/AI/Agent.ts`의 LLM 루프는 미구현(TODO)이라 두뇌는 별도 SDK로 붙여야 한다.
- React는 1급 지원, PHP는 Docker 경유 배포만 가능하다.
- 가장 안전하고 빠른 수익화 조합은 **① 한국어 교육 콘텐츠 + ② 템플릿 판매 + ④ MCP 서버**다. 이 3개는 Alchemy의 성패와 무관하게 "서버리스·IaC·AI 인프라 전문가"라는 개인 자산을 남긴다.

---

### 참고 링크

- 포크 레포: https://github.com/bmshin94/alchemy
- 원본 레포: https://github.com/alchemy-run/alchemy
- 공식 문서: https://alchemy.run
- 개요: https://alchemy.run/what-is-alchemy
- 시작하기: https://alchemy.run/getting-started
- 튜토리얼: https://alchemy.run/tutorial/part-1
- AI용 문서 인덱스: https://alchemy.run/llms.txt
- Effect: https://effect.website
- Discord: https://discord.gg/jwKw8dBJdN
- 예제 모음: https://github.com/alchemy-run/alchemy/tree/main/examples
