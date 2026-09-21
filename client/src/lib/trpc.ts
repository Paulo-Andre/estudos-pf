import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

type LegacyTypedClient = ReturnType<typeof createTRPCReact<AppRouter>>;

type AnyInput = Record<string, any> | undefined | null;
let csrfToken: string | null = null;

function qs(input: AnyInput, allowed?: string[]) {
  if (!input) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (allowed && !allowed.includes(key)) continue;
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? "?" + text : "";
}

async function getCsrf() {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/v1/auth/csrf/", { credentials: "include" });
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

function errorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data === "string") return data;
  const first = Object.values(data)[0];
  if (Array.isArray(first)) return String(first[0]);
  if (typeof first === "string") return first;
  return fallback;
}

async function api(path: string, init: RequestInit = {}) {
  const method = String(init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRFToken", await getCsrf());
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "include" });
  const text = await response.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) throw new Error(errorMessage(data, "Falha na comunicação com o servidor."));
  return data;
}

function json(method: string, body?: any): RequestInit {
  return { method, body: body === undefined ? undefined : JSON.stringify(body) };
}

async function uploadImage(input: any) {
  const clean = String(input?.base64 || "").replace(/^data:[^,]+,/, "").replace(/\s/g, "");
  const bytes = Uint8Array.from(atob(clean), c => c.charCodeAt(0));
  const mime = String(input?.mimeType || "image/jpeg");
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), "upload." + ext);
  return api("/api/v1/platform/admin/uploads/images/", { method: "POST", body: form });
}

function id(v: any) { return encodeURIComponent(String(v)); }

async function queryProcedure(path: string, input: any) {
  switch (path) {
    case "auth.me": return api("/api/v1/auth/me/");
    case "study.state": return api("/api/v1/study/state/");
    case "study.access": return api("/api/v1/courses/access/");
    case "study.courseCatalog": return api("/api/v1/courses/");
    case "study.questions.list": return api("/api/v1/knowledge/courses/" + id(input.courseId) + "/questions/");
    case "study.bundle": return api("/api/v1/knowledge/courses/" + id(input.courseId) + "/study-bundle/");
    case "study.dailyCheck": return api("/api/v1/study/courses/" + id(input.courseId) + "/daily-check/");
    case "study.review.list": return api("/api/v1/study/review/" + qs(input, ["status"]));
    case "study.contentProgress.get": return api("/api/v1/study/courses/" + id(input.courseId) + "/progress/");
    case "study.roadmap.list": return api("/api/v1/study/roadmap/" + qs(input, ["courseId"]));
    case "study.note": return api("/api/v1/study/notes/" + id(input.moduleId) + "/");
    case "competition.settings": return api("/api/v1/platform/competition/settings/");
    case "competition.courses": return api("/api/v1/platform/competition/courses/");
    case "competition.ranking": return api("/api/v1/platform/competition/ranking/" + qs(input, ["courseId"]));
    case "competition.myScore": return api("/api/v1/platform/competition/my-score/" + qs(input, ["courseId"]));
    case "competition.history": return api("/api/v1/platform/competition/history/" + qs(input, ["courseId"]));
    case "competition.monthlyGoal": return api("/api/v1/platform/competition/monthly-goal/" + qs(input, ["courseId"]));
    case "competition.round": return api("/api/v1/platform/competition/" + id(input.roundId) + "/");
    case "commerce.plans": return api("/api/v1/commerce/plans/");
    case "commerce.myOrders": return api("/api/v1/commerce/orders/");
    case "commerce.myAccesses": return api("/api/v1/commerce/accesses/");
    case "platform.settings": { const d = await api("/api/v1/platform/settings/"); return d.general; }
    case "platform.contacts": { const d = await api("/api/v1/platform/settings/"); return d.contact; }
    case "platform.alerts": return api("/api/v1/platform/alerts/");
    case "admin.users": return api("/api/v1/admin/users/" + qs(input, ["search"]));
    case "admin.stats": return api("/api/v1/admin/stats/");
    case "admin.courses": return api("/api/v1/courses/admin/");
    case "admin.auditLogs": return api("/api/v1/audit/");
    case "admin.enrollments": return api("/api/v1/courses/admin/users/" + id(input.userId) + "/enrollments/");
    case "admin.alerts.list": return api("/api/v1/platform/admin/alerts/");
    case "admin.contacts.get": { const d = await api("/api/v1/platform/admin/settings/"); return d.contact; }
    case "admin.settings.get": { const d = await api("/api/v1/platform/admin/settings/"); return d.general; }
    case "admin.competition.getSettings": return api("/api/v1/platform/admin/competition/");
    case "admin.competition.getMonthlyGoal": { const d = await api("/api/v1/platform/admin/competition/"); return d.monthlyGoal; }
    case "admin.disciplines.list": return api("/api/v1/knowledge/admin/disciplines/");
    case "admin.contents.list": return api("/api/v1/knowledge/admin/contents/");
    case "admin.questions.list": return api("/api/v1/knowledge/admin/questions/" + qs(input, ["search", "status", "contentId"]));
    case "admin.questions.changelog": return api("/api/v1/knowledge/admin/questions/" + id(input.id) + "/changelog/");
    case "admin.contents.changelog": return api("/api/v1/knowledge/admin/contents/" + id(input.id) + "/changelog/");
    case "admin.review.list": return api("/api/v1/knowledge/admin/reviews/" + qs(input, ["itemType", "status"]));
    case "admin.review.pendingCount": { const d = await api("/api/v1/knowledge/admin/reviews/pending-count/"); return d.count; }
    case "admin.commerce.plans": return api("/api/v1/commerce/admin/plans/");
    case "admin.commerce.coupons": return api("/api/v1/commerce/admin/coupons/");
    case "admin.commerce.orders": return api("/api/v1/commerce/admin/orders/" + qs(input, ["status"]));
    case "admin.commerce.metrics": return api("/api/v1/commerce/admin/metrics/");
    default: throw new Error("Consulta REST ainda não mapeada: " + path);
  }
}

async function mutationProcedure(path: string, input: any) {
  switch (path) {
    case "auth.login": {
      const d = await api("/api/v1/auth/login/", json("POST", input)); csrfToken = null; return d;
    }
    case "auth.register": {
      const d = await api("/api/v1/auth/register/", json("POST", input)); csrfToken = null; return d;
    }
    case "auth.logout": { const d = await api("/api/v1/auth/logout/", json("POST", {})); csrfToken = null; return d; }
    case "auth.requestPasswordReset": return api("/api/v1/auth/password-reset/request/", json("POST", input));
    case "auth.resetPassword": return api("/api/v1/auth/password-reset/confirm/", json("POST", input));
    case "auth.updateProfile": return api("/api/v1/auth/profile/", json("PUT", input));
    case "auth.changePassword": { const d = await api("/api/v1/auth/change-password/", json("POST", input)); csrfToken = null; return d; }
    case "study.answer": return api("/api/v1/study/answer/", json("POST", input));
    case "study.completeModule": return api("/api/v1/study/complete-module/", json("POST", input));
    case "study.dismissDailyCheck": return api("/api/v1/study/courses/" + id(input.courseId) + "/daily-check/", { method: "DELETE" });
    case "study.review.add": return api("/api/v1/study/review/", json("POST", input));
    case "study.review.complete": return api("/api/v1/study/review/" + id(input.id) + "/mastered/", json("POST", {}));
    case "study.review.remove": return api("/api/v1/study/review/" + id(input.id) + "/", { method: "DELETE" });
    case "study.contentProgress.open": return api("/api/v1/study/courses/" + id(input.courseId) + "/content/" + id(input.contentId) + "/progress/", json("POST", { completed: false }));
    case "study.contentProgress.complete": return api("/api/v1/study/courses/" + id(input.courseId) + "/content/" + id(input.contentId) + "/progress/", json("POST", { completed: true }));
    case "study.roadmap.save": return api("/api/v1/study/roadmap/", json("POST", input));
    case "study.roadmap.remove": return api("/api/v1/study/roadmap/" + id(input.id) + "/", { method: "DELETE" });
    case "study.submitSimulation": return api("/api/v1/study/simulation/", json("POST", input));
    case "study.saveNote": return api("/api/v1/study/notes/" + id(input.moduleId) + "/", json("PUT", { content: input.content }));
    case "competition.startRound": return api("/api/v1/platform/competition/start/", json("POST", input || {}));
    case "competition.submitAnswer": return api("/api/v1/platform/competition/" + id(input.roundId) + "/answer/", json("POST", input));
    case "commerce.createOrder": return api("/api/v1/commerce/orders/create/", json("POST", input));
    case "commerce.checkout": return api("/api/v1/commerce/orders/" + id(input.orderId) + "/checkout/", json("POST", {}));
    case "platform.dismissAlert": return api("/api/v1/platform/alerts/" + id(input.alertId) + "/dismiss/", json("POST", {}));
    case "admin.grantEnrollment": return api("/api/v1/courses/admin/enrollments/grant/", json("POST", input));
    case "admin.revokeEnrollment": return api("/api/v1/courses/admin/enrollments/revoke/", json("POST", input));
    case "admin.createCourse": return api("/api/v1/courses/admin/", json("POST", input));
    case "admin.updateCourse": return api("/api/v1/courses/admin/" + id(input.courseId) + "/", json("PUT", input.data));
    case "admin.uploadCourseCover": return uploadImage(input);
    case "admin.setCourseActive": return api("/api/v1/courses/admin/" + id(input.courseId) + "/active/", json("POST", { isActive: input.isActive }));
    case "admin.deleteCourse": return api("/api/v1/courses/admin/" + id(input.courseId) + "/", json("DELETE", { confirmation: input.confirmation }));
    case "admin.updateUser": return api("/api/v1/admin/users/" + id(input.userId) + "/", json("PUT", input.data || input));
    case "admin.resetPassword": return api("/api/v1/admin/users/" + id(input.userId) + "/reset-password/", json("POST", input));
    case "admin.setBlocked": return api("/api/v1/admin/users/" + id(input.userId) + "/block/", json("POST", { isBlocked: input.isBlocked }));
    case "admin.deleteUser": return api("/api/v1/admin/users/" + id(input.userId) + "/", json("DELETE", { confirmation: input.confirmation || input.confirmationUsername }));
    case "admin.alerts.create": return api("/api/v1/platform/admin/alerts/", json("POST", input));
    case "admin.alerts.setActive": return api("/api/v1/platform/admin/alerts/" + id(input.alertId) + "/", json("POST", { isActive: input.isActive }));
    case "admin.contacts.save": return api("/api/v1/platform/admin/settings/", json("PUT", { contact: input }));
    case "admin.settings.save": return api("/api/v1/platform/admin/settings/", json("PUT", { general: input }));
    case "admin.settings.uploadLogo": return uploadImage(input);
    case "admin.competition.saveSettings": return api("/api/v1/platform/admin/competition/save/", json("PUT", input));
    case "admin.competition.saveMonthlyGoal": return api("/api/v1/platform/admin/competition/save/", json("PUT", { monthlyGoal: input }));
    case "admin.competition.clearRanking": return api("/api/v1/platform/admin/competition/clear/", json("POST", input));
    case "admin.disciplines.create": return api("/api/v1/knowledge/admin/disciplines/", json("POST", input));
    case "admin.disciplines.update": return api("/api/v1/knowledge/admin/disciplines/" + id(input.id) + "/", json("PUT", input.data));
    case "admin.contents.create": return api("/api/v1/knowledge/admin/contents/", json("POST", input));
    case "admin.contents.update": return api("/api/v1/knowledge/admin/contents/" + id(input.id) + "/", json("PUT", input.data));
    case "admin.contents.uploadImage": return uploadImage(input);
    case "admin.contents.sendToReview": return api("/api/v1/knowledge/admin/reviews/submit/", json("POST", { itemType: "content", itemId: input.id }));
    case "admin.questions.create": return api("/api/v1/knowledge/admin/questions/", json("POST", input));
    case "admin.questions.update": return api("/api/v1/knowledge/admin/questions/" + id(input.id) + "/", json("PUT", input.data));
    case "admin.questions.remove": return api("/api/v1/knowledge/admin/questions/" + id(input.id) + "/", { method: "DELETE" });
    case "admin.questions.sendToReview": return api("/api/v1/knowledge/admin/reviews/submit/", json("POST", { itemType: "question", itemId: input.id }));
    case "admin.review.decide": return api("/api/v1/knowledge/admin/reviews/" + id(input.id) + "/decision/", json("POST", { decision: input.decision, notes: input.notes }));
    case "admin.commerce.createPlan": return api("/api/v1/commerce/admin/plans/", json("POST", input));
    case "admin.commerce.updatePlan": return api("/api/v1/commerce/admin/plans/" + id(input.id) + "/", json("PUT", input.data));
    case "admin.commerce.uploadPlanImage": return uploadImage(input);
    case "admin.commerce.createCoupon": return api("/api/v1/commerce/admin/coupons/", json("POST", input));
    case "admin.commerce.updateCoupon": return api("/api/v1/commerce/admin/coupons/" + id(input.id) + "/", json("PUT", input.data));
    case "admin.commerce.deleteCoupon": return api("/api/v1/commerce/admin/coupons/" + id(input.id) + "/", { method: "DELETE" });
    case "admin.commerce.approveOrder": return api("/api/v1/commerce/admin/orders/" + id(input.orderId) + "/approve/", json("POST", input));
    case "admin.commerce.cancelOrder": return api("/api/v1/commerce/admin/orders/" + id(input.orderId) + "/cancel/", json("POST", {}));
    case "admin.backup.export": return api("/api/v1/audit/backup/");
    default: throw new Error("Mutação REST ainda não mapeada: " + path);
  }
}

function utilsProxy(queryClient: ReturnType<typeof useQueryClient>, parts: string[] = []): any {
  return new Proxy(() => undefined, {
    get(_target, prop) {
      const key = String(prop);
      if (key === "invalidate") return (input?: any) => queryClient.invalidateQueries({ queryKey: input === undefined ? [parts.join(".")] : [parts.join("."), input] });
      if (key === "refetch") return (input?: any) => queryClient.refetchQueries({ queryKey: input === undefined ? [parts.join(".")] : [parts.join("."), input] });
      if (key === "setData") return (input: any, data: any) => queryClient.setQueryData([parts.join("."), input ?? null], data);
      if (key === "getData") return (input?: any) => queryClient.getQueryData([parts.join("."), input ?? null]);
      return utilsProxy(queryClient, [...parts, key]);
    },
  });
}

function procedureProxy(parts: string[] = []): any {
  return new Proxy(() => undefined, {
    get(_target, prop) {
      const key = String(prop);
      if (parts.length === 0 && key === "useUtils") return () => utilsProxy(useQueryClient());
      if (key === "useQuery") {
        return (input?: any, options: any = {}) => {
          const path = parts.join(".");
          return useQuery({ queryKey: [path, input ?? null], queryFn: () => queryProcedure(path, input), ...options });
        };
      }
      if (key === "useMutation") {
        return (options: any = {}) => {
          const path = parts.join(".");
          return useMutation({ mutationFn: (input: any) => mutationProcedure(path, input), ...options });
        };
      }
      return procedureProxy([...parts, key]);
    },
  });
}

export const trpc = procedureProxy() as unknown as LegacyTypedClient;
