CREATE DATABASE IF NOT EXISTS espmjunior DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE espmjunior;

-- DROP TABLE IF EXISTS config;
CREATE TABLE config (
  token char(64) NOT NULL,
  qr1 char(16) NOT NULL,
  qr2 char(16) NOT NULL,
  cicloatual tinyint NOT NULL,
  mesinicialciclo tinyint NOT NULL,
  anoinicialciclo smallint NOT NULL,
  mesfinalciclo tinyint NOT NULL,
  anofinalciclo smallint NOT NULL
);

INSERT INTO config (token, qr1, qr2, cicloatual, mesinicialciclo, anoinicialciclo, mesfinalciclo, anofinalciclo) VALUES ('', '', '', 1, 0, 0, 0, 0);

-- DROP TABLE IF EXISTS perfil;
CREATE TABLE perfil (
  idperfil int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idperfil),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO perfil (nome) VALUES ('Administrador'), ('Comum');

-- DROP TABLE IF EXISTS cargo;
CREATE TABLE cargo (
  idcargo int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idcargo),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO cargo (nome) VALUES ('Administrador'), ('RH'), ('Financeiro');

-- DROP TABLE IF EXISTS curso;
CREATE TABLE curso (
  idcurso int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idcurso),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO curso (nome) VALUES ('Nenhum'), ('ADM'), ('RI'), ('PP'), ('CISO'), ('SI');

CREATE TABLE departamento (
	id_departamento int PRIMARY KEY AUTO_INCREMENT, 
  desc_departamento varchar(45),
  UNIQUE KEY desc_departamento_UN (desc_departamento)
);

INSERT INTO departamento (desc_departamento) VALUES ('Administração'), ('Comercial'), ('RH'), ('Projetos'), ('Marketing');

-- DROP TABLE IF EXISTS usuario;
CREATE TABLE usuario (
  idusuario int NOT NULL AUTO_INCREMENT,
  login varchar(100) NOT NULL,
  nome varchar(100) NOT NULL,
  idperfil int NOT NULL,
  idciclo int NOT NULL,
  versao int NOT NULL,
  token char(32) DEFAULT NULL,
  idcargo int NOT NULL,
  idcurso int NOT NULL,
  id_departamento int NOT NULL,
  semestre int NOT NULL,
  daysoff tinyint NOT NULL,
  endereco varchar(100) NOT NULL,
  telefone varchar(20) NOT NULL,
  nascimento datetime NOT NULL,
  senhaqr varchar(100) NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (idusuario),
  UNIQUE KEY login_UN (login),
  KEY usuario_nome_idx (nome),
  KEY usuario_idperfil_FK_idx (idperfil),
  KEY usuario_idcargo_FK_idx (idcargo),
  KEY usuario_idcurso_FK_idx (idcurso),
  KEY usuario_id_departamento_FK_idx (id_departamento),
  CONSTRAINT usuario_idperfil_FK FOREIGN KEY (idperfil) REFERENCES perfil (idperfil) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT usuario_idcargo_FK FOREIGN KEY (idcargo) REFERENCES cargo (idcargo) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT usuario_idcurso_FK FOREIGN KEY (idcurso) REFERENCES curso (idcurso) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT usuario_id_departamento_FK FOREIGN KEY (id_departamento) REFERENCES departamento (id_departamento) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO usuario (login, nome, idperfil, idciclo, versao, token, idcargo, idcurso, id_departamento, semestre, daysoff, endereco, telefone, nascimento, criacao) VALUES ('admin@espm.br', 'Administrador', 1, 0, 0, NULL, 1, 1, 1, 1, 0, '', '', NOW(), NOW());

-- DROP TABLE IF EXISTS ciclo;
CREATE TABLE ciclo (
  idciclo int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  nome varchar(50) NOT NULL,
  inicio datetime NOT NULL,
  termino datetime NULL,
  PRIMARY KEY (idciclo),
  KEY ciclo_idusuario_inicio_termino_idx (idusuario, inicio, termino),
  KEY ciclo_idusuario_termino_idx (idusuario, termino),
  CONSTRAINT ciclo_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS dayoff;
CREATE TABLE dayoff (
  iddayoff int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  idciclo int NOT NULL,
  data datetime NOT NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (iddayoff),
  KEY dayoff_data_idx (data),
  KEY dayoff_idusuario_idciclo_FK_idx (idusuario, idciclo),
  KEY dayoff_idciclo_FK_idx (idciclo),
  CONSTRAINT dayoff_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT dayoff_idciclo_FK FOREIGN KEY (idciclo) REFERENCES ciclo (idciclo) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS horapessoal;
CREATE TABLE horapessoal (
  idhorapessoal int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  idciclo int NOT NULL,
  minutos smallint NOT NULL,
  data datetime NOT NULL,
  criacao datetime NOT NULL,
  PRIMARY KEY (idhorapessoal),
  KEY horapessoal_data_idx (data),
  KEY horapessoal_idusuario_idciclo_FK_idx (idusuario, idciclo),
  KEY horapessoal_idciclo_FK_idx (idciclo),
  CONSTRAINT horapessoal_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT horapessoal_idciclo_FK FOREIGN KEY (idciclo) REFERENCES ciclo (idciclo) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS ficha_medica;
CREATE TABLE ficha_medica (
  idusuario int NOT NULL,
  tipo_sanguineo varchar(5) NOT NULL,
  alergia varchar(100) NOT NULL,
  plano_saude varchar(50) NOT NULL,
  contato_emergencia varchar(20) NOT NULL,
  hospital_preferencia varchar(50) NOT NULL,
  PRIMARY KEY (idusuario),
  CONSTRAINT ficha_medica_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO ficha_medica (idusuario, tipo_sanguineo, alergia, plano_saude, contato_emergencia, hospital_preferencia) VALUES (1, '', '', '', '', '');

-- DROP TABLE IF EXISTS ponto;
CREATE TABLE ponto (
  idponto int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  online tinyint NOT NULL,
  atraso tinyint NOT NULL,
  entrada datetime NOT NULL,
  saida datetime NULL,
  PRIMARY KEY (idponto),
  KEY ponto_entrada_FK_idx (entrada),
  KEY ponto_idusuario_FK_idx (idusuario, entrada),
  CONSTRAINT ponto_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE evento (
  id_evento int NOT NULL AUTO_INCREMENT,
  nome_evento varchar(100) NOT NULL,
  desc_evento varchar(100) NOT NULL,
  inicio_evento datetime NOT NULL,
  termino_evento datetime NOT NULL,
  PRIMARY KEY (id_evento),
  KEY evento_inicio_termino_ix (inicio_evento, termino_evento),
  KEY evento_termino_ix (termino_evento)
);

CREATE TABLE evento_ocorrencia (
  id_ocorrencia int NOT NULL AUTO_INCREMENT,
  id_evento int NOT NULL,
  inicio_ocorrencia datetime NOT NULL,
  PRIMARY KEY (id_ocorrencia),
  KEY evento_ocorrencia_id_evento_ix (id_evento, inicio_ocorrencia),
  KEY evento_ocorrencia_inicio_ocorrencia_ix (inicio_ocorrencia),
  FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE CASCADE ON UPDATE RESTRICT
);

CREATE TABLE sala (
	id_sala int PRIMARY KEY AUTO_INCREMENT,
  desc_sala varchar(45)
);

CREATE TABLE evento_sala (
	id_evento int NOT NULL,
  id_sala int NOT NULL,
  FOREIGN KEY(id_evento) REFERENCES evento(id_evento),
  FOREIGN KEY(id_sala) REFERENCES sala(id_sala),
  PRIMARY KEY (id_evento, id_sala)
);

CREATE TABLE evento_departamento (
	id_evento int NOT NULL,
  id_departamento int NOT NULL,
  FOREIGN KEY (id_evento) REFERENCES evento(id_evento),
  FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento),
  PRIMARY KEY (id_evento, id_departamento)
);

CREATE TABLE link (
  id_link int NOT NULL AUTO_INCREMENT,
  nome_link varchar(100) NOT NULL,
  desc_link varchar(200) NOT NULL,
  url_link varchar(250) NOT NULL,
  PRIMARY KEY (id_link)
);
