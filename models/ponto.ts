import Sql = require("../infra/sql"); 

export = class Ponto {
	public idponto: number;
	public idusuario: number;
	public entrada: string;
	public saida: string;

	public static async listarDeUsuarioMes(idusuario: number, mes: number, ano: number): Promise<Ponto[]> {
		let lista: Ponto[] = null;

		let proximo_ano = ano;
		let proximo_mes = mes + 1;
		if (proximo_mes > 12) {
			proximo_mes = 1;
			proximo_ano++;
		}
		let inicio = `${ano}-${mes}-01`;
		let fim = `${proximo_ano}-${proximo_mes}-01`;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select idusuario, date_format(entrada, '%Y-%m-%d %H:%i') entrada, date_format(saida, '%Y-%m-%d %H:%i') saida from ponto where idusuario = ? and entrada >= ? and entrada < ?", [idusuario, inicio, fim])) as Ponto[];
		});

		return lista || [];
	}

	public static async marcarEntrada(idusuario: number, qr: string, online: boolean): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (!online) {
				const valido = await sql.scalar("select token from tokenqr where qr1 = ? or qr2 = ?", [qr, qr]);
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
				const valido = await sql.scalar("select token from tokenqr where qr1 = ? or qr2 = ?", [qr, qr]);
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
