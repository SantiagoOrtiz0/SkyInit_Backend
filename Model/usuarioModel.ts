import { db } from "./conexion.ts";
import { usuarios, roles, favoritos, propiedades, imagenespropiedad, serviciossolicitados, serviciosmantenimiento, inmobiliarias, estadosreparacion } from "./schema.ts";
import { eq, sql } from "../Dependencies/dependencias.ts";

export interface UsuarioCreate {
    Nombre: string;
    Correo: string;
    Password: string;  // Ya hasheado
    Telefono?: string;
    RolID?: number;
    AceptoTerminos?: boolean;
}

export interface ActualizarPerfilData {
    nombre: string;
    telefono: string | null;
    contrasenaHash?: string;
}

/** Busca un usuario por correo (para login y validar duplicados) */
export async function buscarPorCorreo(correo: string) {
    const resultado = await db.select({
        usuarioID: usuarios.usuarioID,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
        telefono: usuarios.telefono,
        rolID: usuarios.rolID,
        nombreRol: roles.nombreRol,
        estadoCuenta: usuarios.estadoCuenta,
        fotoPerfil: usuarios.fotoPerfil,
        fechaRegistro: usuarios.fechaRegistro,
        googleId: usuarios.googleId,
        contrasenaHash: usuarios.contrasenaHash,
        aceptoTerminos: usuarios.aceptoTerminos,
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
    .where(eq(usuarios.correo, correo))
    .limit(1);

    return resultado[0] ?? null;
}

/** Busca un usuario por ID - sin hash */
export async function buscarPorId(id: number) {
    const resultado = await db.select({
        usuarioID: usuarios.usuarioID,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
        telefono: usuarios.telefono,
        rolID: usuarios.rolID,
        nombreRol: roles.nombreRol,
        estadoCuenta: usuarios.estadoCuenta,
        fotoPerfil: usuarios.fotoPerfil,
        fechaRegistro: usuarios.fechaRegistro,
        aceptoTerminos: usuarios.aceptoTerminos,
        contrasenaHash: usuarios.contrasenaHash,
        inmobiliariaID: usuarios.inmobiliariaID
    })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
    .where(eq(usuarios.usuarioID, id))
    .limit(1);

    return resultado[0] ?? null;
}

/** Verificar si un correo ya está registrado */
export async function correoExiste(correo: string): Promise<boolean> {
    const resultado = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(usuarios)
        .where(eq(usuarios.correo, correo));

    return Number(resultado[0].total) > 0;
}

/** Crear un nuevo usuario */
export async function crearUsuario(data: UsuarioCreate): Promise<number> {
    const resultado = await db.insert(usuarios).values({
        nombre: data.Nombre,
        correo: data.Correo,
        contrasenaHash: data.Password,
        telefono: data.Telefono ?? null,
        rolID: data.RolID ?? 3,
        estadoCuenta: "Activa",
        aceptoTerminos: data.AceptoTerminos ? 1 : 0,
        fechaAceptacionTerminos: data.AceptoTerminos ? sql`NOW()` : null,
    });

    return Number(resultado[0].insertId);
}

/** Marcar la aceptación de términos del usuario */
export async function aceptarTerminos(usuarioId: number): Promise<void> {
    await db
        .update(usuarios)
        .set({
            aceptoTerminos: 1,
            fechaAceptacionTerminos: sql`NOW()`,
        })
        .where(eq(usuarios.usuarioID, usuarioId));
}

/** Actualizar nombre, teléfono y contraseña del perfil */
export async function actualizarPerfil(id: number, data: ActualizarPerfilData): Promise<void> {
    await db
        .update(usuarios)
        .set({
            nombre: data.nombre,
            telefono: data.telefono,
            ...(data.contrasenaHash ? { contrasenaHash: data.contrasenaHash } : {}),
        })
        .where(eq(usuarios.usuarioID, id));
}

/** Actualizar la foto de perfil del usuario */
export async function actualizarFotoPerfil(id: number, url: string): Promise<void> {
    await db
        .update(usuarios)
        .set({ fotoPerfil: url })
        .where(eq(usuarios.usuarioID, id));
}

/** Obtener todas las propiedades guardadas como favorito por el usuario */
export async function obtenerFavoritos(usuarioId: number) {
    const resultado = await db
        .select({
            favoritoID:         favoritos.favoritoID,
            propiedadID:        propiedades.propiedadID,
            titulo:             propiedades.titulo,
            precio:             propiedades.precio,
            direccion:          propiedades.direccion,
            ciudad:             propiedades.ciudad,
            estado:             propiedades.estado,
            destacada:          propiedades.destacada,
            fechaAgregado:      favoritos.fechaAgregado,
            imagen:             imagenespropiedad.url,
        })
        .from(favoritos)
        .innerJoin(propiedades, eq(favoritos.propiedadID, propiedades.propiedadID))
        .leftJoin(
            imagenespropiedad,
            sql`${imagenespropiedad.propiedadID} = ${propiedades.propiedadID}
                AND ${imagenespropiedad.imagenID} = (
                    SELECT MIN(ip2.ImagenID)
                    FROM imagenespropiedad ip2
                    WHERE ip2.PropiedadID = ${propiedades.propiedadID}
                )`
        )
        .where(eq(favoritos.usuarioID, usuarioId));

    return resultado;
}

/** Agregar una propiedad a favoritos */
export async function agregarFavorito(usuarioId: number, propiedadId: number): Promise<void> {
    await db.insert(favoritos).values({
        usuarioID: usuarioId,
        propiedadID: propiedadId,
    });
}

/** Eliminar una propiedad de favoritos */
export async function eliminarFavorito(usuarioId: number, propiedadId: number): Promise<void> {
    await db
        .delete(favoritos)
        .where(
            sql`${favoritos.usuarioID} = ${usuarioId} AND ${favoritos.propiedadID} = ${propiedadId}`
        );
}

/** Obtener todas las solicitudes de servicio del usuario */
export async function obtenerSolicitudesUsuario(usuarioId: number) {
    const resultado = await db
        .select({
            solicitudID:        serviciossolicitados.solicitudID,
            servicioID:         serviciossolicitados.servicioID,
            nombreServicio:     serviciosmantenimiento.nombre,
            descripcionServicio: serviciosmantenimiento.descripcion,
            precio:             serviciosmantenimiento.precio,
            notas:              serviciossolicitados.notas,
            fechaSolicitud:     serviciossolicitados.fechaSolicitud,
            estadoReparacionID: serviciossolicitados.estadoReparacionID,
            estado:             estadosreparacion.descripcion,
        })
        .from(serviciossolicitados)
        .innerJoin(
            serviciosmantenimiento,
            eq(serviciossolicitados.servicioID, serviciosmantenimiento.servicioID)
        )
        .leftJoin(
            estadosreparacion,
            eq(serviciossolicitados.estadoReparacionID, estadosreparacion.estadoReparacionID)
        )
        .where(eq(serviciossolicitados.usuarioID, usuarioId));

    return resultado;
}

export async function listarUsuariosAdmin() {
    return await db
        .select({
        usuarioID: usuarios.usuarioID,
        nombre: usuarios.nombre,
        correo: usuarios.correo,
        telefono: usuarios.telefono,
        estadoCuenta: usuarios.estadoCuenta,
        rolID: usuarios.rolID,
        nombreRol: roles.nombreRol,
        inmobiliariaID: usuarios.inmobiliariaID,
        inmobiliariaNombre: inmobiliarias.nombre,
        fotoPerfil: usuarios.fotoPerfil,
        })
        .from(usuarios)
        .leftJoin(roles, eq(usuarios.rolID, roles.rolID))
        .leftJoin(inmobiliarias, eq(usuarios.inmobiliariaID, inmobiliarias.inmobiliariaID));
}

export async function listarRoles() {
    return await db.select().from(roles);
}

export async function crearUsuarioAdmin(data: {
    nombre: string;
    correo: string;
    contrasenaHash: string;
    telefono?: string | null;
    rolID: number;
    inmobiliariaID?: number | null;
    estadoCuenta?: string;
    }) {
    const [resultado] = await db.insert(usuarios).values({
        nombre: data.nombre,
        correo: data.correo,
        contrasenaHash: data.contrasenaHash,
        telefono: data.telefono ?? null,
        rolID: data.rolID,
        inmobiliariaID: data.inmobiliariaID ?? null,
        estadoCuenta: data.estadoCuenta ?? "Activa",
        aceptoTerminos: 1,
    });
    return Number((resultado as any).insertId ?? 0);
}

export async function actualizarUsuarioAdmin(
    id: number,
    data: {
        nombre?: string;
        telefono?: string | null;
        rolID?: number;
        inmobiliariaID?: number | null;
        estadoCuenta?: string;
        contrasenaHash?: string;
    },
    ) {
    const set: Record<string, unknown> = {};
    if (data.nombre !== undefined) set.nombre = data.nombre;
    if (data.telefono !== undefined) set.telefono = data.telefono;
    if (data.rolID !== undefined) set.rolID = data.rolID;
    if (data.inmobiliariaID !== undefined) set.inmobiliariaID = data.inmobiliariaID;
    if (data.estadoCuenta !== undefined) set.estadoCuenta = data.estadoCuenta;
    if (data.contrasenaHash !== undefined) set.contrasenaHash = data.contrasenaHash;

    await db.update(usuarios).set(set).where(eq(usuarios.usuarioID, id));
}

export interface PerfilAgente {
    usuarioID: number;
    nombre: string;
    correo: string;
    telefono: string | null;
    fotoPerfil: string | null;
    fechaRegistro: Date | string;
    rol: string;
    inmobiliariaID: number | null;
    inmobiliariaNombre: string | null;
}

/** Perfil del agente. No selecciona ContraseñaHash ni GoogleID. */
export async function obtenerPerfilAgente(agenteID: number): Promise<PerfilAgente | null> {
    const filas = await db
        .select({
            usuarioID: usuarios.usuarioID,
            nombre: usuarios.nombre,
            correo: usuarios.correo,
            telefono: usuarios.telefono,
            fotoPerfil: usuarios.fotoPerfil,
            fechaRegistro: usuarios.fechaRegistro,
            rol: roles.nombreRol,
            inmobiliariaID: usuarios.inmobiliariaID,
            inmobiliariaNombre: inmobiliarias.nombre,
        })
        .from(usuarios)
        .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
        .leftJoin(inmobiliarias, eq(usuarios.inmobiliariaID, inmobiliarias.inmobiliariaID))
        .where(eq(usuarios.usuarioID, agenteID))
        .limit(1);

    return filas[0] ?? null;
}

export interface PerfilSuperAdmin {
    usuarioID: number;
    nombre: string;
    correo: string;
    telefono: string | null;
    fotoPerfil: string | null;
    fechaRegistro: Date | string;
    rol: string;
    estadoCuenta: string;
}

/** Perfil propio. No selecciona ContraseñaHash, GoogleID ni InmobiliariaID. */
export async function obtenerPerfilSuperAdmin(usuarioID: number): Promise<PerfilSuperAdmin | null> {
    const filas = await db
        .select({
            usuarioID: usuarios.usuarioID,
            nombre: usuarios.nombre,
            correo: usuarios.correo,
            telefono: usuarios.telefono,
            fotoPerfil: usuarios.fotoPerfil,
            fechaRegistro: usuarios.fechaRegistro,
            rol: roles.nombreRol,
            estadoCuenta: usuarios.estadoCuenta,
        })
        .from(usuarios)
        .innerJoin(roles, eq(usuarios.rolID, roles.rolID))
        .where(eq(usuarios.usuarioID, usuarioID))
        .limit(1);

    return filas[0] ?? null;
}