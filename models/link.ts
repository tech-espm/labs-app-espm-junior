import Sql = require("../infra/sql");

export = class Link {
	public id_link: number;
	public nome_link: string;
	public desc_link: string;
	public url_link: string;

	private static validar(link: Link): string {
		if (!link)
			return "Dados inválidos";

		link.nome_link = (link.nome_link || "").normalize().trim();
		if (!link.nome_link || link.nome_link.length > 100)
			return "Nome do link inválido";

		link.desc_link = (link.desc_link || "").normalize().trim();
		if (link.desc_link.length > 200)
			return "Descrição do link inválida";

		link.url_link = (link.url_link || "").normalize().trim();
		if (!link.url_link || link.url_link.length > 250 || !link.url_link.startsWith("http"))
			return "Endereço do link inválido";

		return null; 
	}

	public static async listar(): Promise<Link[]> {
		let lista: Link[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select id_link, nome_link, desc_link, url_link from link")) as Link[];
		});

		return lista || [];
	}

	public static async obter(id_link: number): Promise<Link> {
		let lista: Link[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select id_link, nome_link, desc_link, url_link from link where id_link = ?", [id_link])) as Link[];
		});

		return (lista && lista[0]) || null;
	}

	public static async criar(link: Link): Promise<string> {
		let res: string;
		if ((res = Link.validar(link)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("insert into link (nome_link, desc_link, url_link) values (?, ?, ?)", [link.nome_link, link.desc_link, link.url_link]);
		});

		return res;
	}

	public static async alterar(link: Link): Promise<string> {
		let res: string;
		if ((res = Link.validar(link)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update link set nome_link = ?, desc_link = ?, url_link = ? where id_link = ?", [link.nome_link, link.desc_link, link.url_link, link.id_link]);
			if (!sql.linhasAfetadas)
				res = "Link não encontrado";
		});

		return res;
	}

	public static async excluir(id_link: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("delete from link where id_link = ?", [id_link]);
			if (!sql.linhasAfetadas)
				res = "Link não encontrado";
		});

		return res;
	}
};
