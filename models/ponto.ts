import Sql = require("../infra/sql"); 

export = class Ponto {
	public idponto: number;
	public idusuario: number;
	public entrada: string;
	public saida: string;

	public static async listar(ano: number, mes: number, idusuario?: number): Promise<{ idusuario: number, nome: string, data: string }[]> {
		let lista: { idusuario: number, nome: string, data: string }[] = null,
			proximo_ano = ano,
			proximo_mes = mes + 1;

		if (proximo_mes > 12) {
			proximo_mes = 1;
			proximo_ano++;
		}

		const inicio = `${ano}-${mes}-01`,
			fim = `${proximo_ano}-${proximo_mes}-01`;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select p.idusuario, u.nome, date_format(p.entrada, '%Y-%m-%d %H:%i') data from ponto p inner join usuario u on u.idusuario = p.idusuario where p.entrada >= ? and p.entrada < ?" + (idusuario ? " and p.idusuario = ?" : ""), idusuario ? [inicio, fim, idusuario] : [inicio, fim]);
		});

		return lista || [];
	}

	public static async marcarEntrada(idusuario: number, qr: string, online: boolean): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (!online) {
				const valido = await sql.scalar("select token from config where qr1 = ? or qr2 = ?", [qr, qr]);
				if (!valido) {
					res = "Código QR inválido";
					return;
				}
			}

			const idponto = await sql.scalar("select idponto from ponto where date(entrada) = curdate() and idusuario = ?", [idusuario]) as number;
			if (idponto) {
				res = "Já existe um ponto aberto para a data atual";
				return;
			}

			await sql.query("insert into ponto (idusuario, entrada) values (?, now())", [idusuario]);
		});

		return res;
	}

	public static async marcarSaida(idusuario: number, qr: string, online: boolean): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (!online) {
				const valido = await sql.scalar("select token from config where qr1 = ? or qr2 = ?", [qr, qr]);
				if (!valido) {
					res = "Código QR inválido";
					return;
				}
			}

			const idponto = await sql.scalar("select idponto from ponto where date(entrada) = curdate() and idusuario = ?", [idusuario]) as number;
			if (!idponto) {
				res = "Não existe um ponto aberto para a data atual";
				return;
			}

			await sql.query("update ponto set saida = now() where idponto = ? and saida is null", [idponto]);

			if (sql.linhasAfetadas === 0)
				res = "Já foi marcada a saída para a data atual";
		});

		return res;
	}
};
