import type { Context, Next } from "../Dependencies/dependencias.ts";

/**
 * Limite de peticiones en memoria por IP + clave.
 * Suficiente para una sola instancia; con varias instancias usar Redis.
 */
const registros = new Map<string, { cuenta: number; reinicia: number }>();

setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of registros) if (v.reinicia <= ahora) registros.delete(k);
}, 60_000);

export function limitar(clave: string, maximo: number, ventanaSegundos: number) {
  return async (ctx: Context, next: Next) => {
    // Las peticiones llegan por el proxy de Astro (loopback): en ese caso se usa
    // la IP real que Astro reenvia en X-Forwarded-For.
    let ip = ctx.request.ip;
    if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
      ip = ctx.request.headers.get("x-forwarded-for")?.split(",")[0].trim() || ip;
    }
    const id = `${clave}:${ip}`;
    const ahora = Date.now();
    let reg = registros.get(id);
    if (!reg || reg.reinicia <= ahora) {
      reg = { cuenta: 0, reinicia: ahora + ventanaSegundos * 1000 };
      registros.set(id, reg);
    }
    reg.cuenta++;
    if (reg.cuenta > maximo) {
      const espera = Math.ceil((reg.reinicia - ahora) / 1000);
      ctx.response.status = 429;
      ctx.response.headers.set("Retry-After", String(espera));
      ctx.response.body = { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(espera / 60)} min.` };
      return;
    }
    await next();
  };
}
