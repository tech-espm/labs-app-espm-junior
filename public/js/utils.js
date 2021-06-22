$.validator.addMethod("advancedFileSupport", function (value, element, param) {
	return (window.File && window.FileReader && window.FormData);
}, $.validator.format("Seu browser não suporta tratamento avançado de arquivos (por favor, utilize o Firefox 13+ ou Google Chrome 21+)"));

$.validator.addMethod("maxFileLengthKiB", function (value, element, param) {
	if (!element.files)
		return false;
	return (!value.length || !element.files.length || !element.files[0] || element.files[0].size <= (param << 10));
}, $.validator.format("O tamanho do arquivo deve ser no máximo {0} KiB"));

$.validator.addMethod("fileExtension", function (value, element, param) {
	if (!element.files)
		return false;
	// Do not use str.endsWith() because a few browsers don't support it...
	return (!value.length || !element.files.length || !element.files[0] || endsWith(element.files[0].name.toLowerCase(), param));
}, $.validator.format("A extensão do arquivo deve ser {0}"));

function converterEventos(ocorrencias) {
	if (!ocorrencias)
		return null;
	for (var i = 0; i < ocorrencias.length; i++) {
		// https://fullcalendar.io/docs/event-object
		var data = converterDataISO(ocorrencias[i].inicio_ocorrencia);
		ocorrencias[i].backgroundColor = "#3788d8";
		ocorrencias[i].borderColor = "#3788d8";
		ocorrencias[i].textColor = "#fff";
		ocorrencias[i].title = ocorrencias[i].nome_evento;
		ocorrencias[i].url = ocorrencias[i].desc_evento || "/";
		ocorrencias[i].start = data;
		ocorrencias[i].end = data;
	}
}

function converterDataISO(dataComOuSemHorario) {
	if (!dataComOuSemHorario || !(dataComOuSemHorario = trim(dataComOuSemHorario)))
		return null;
	var b1 = dataComOuSemHorario.indexOf("/");
	var b2 = dataComOuSemHorario.lastIndexOf("/");
	var dia, mes, ano;
	if (b1 <= 0 || b2 <= b1) {
		var b1 = dataComOuSemHorario.indexOf("-");
		var b2 = dataComOuSemHorario.lastIndexOf("-");
		if (b1 <= 0 || b2 <= b1)
			return null;
		ano = parseInt(dataComOuSemHorario.substring(0, b1));
		mes = parseInt(dataComOuSemHorario.substring(b1 + 1, b2));
		dia = parseInt(dataComOuSemHorario.substring(b2 + 1));
	} else {
		dia = parseInt(dataComOuSemHorario.substring(0, b1));
		mes = parseInt(dataComOuSemHorario.substring(b1 + 1, b2));
		ano = parseInt(dataComOuSemHorario.substring(b2 + 1));
	}
	if (isNaN(dia) || isNaN(mes) || isNaN(ano) ||
		dia < 1 || mes < 1 || ano < 1 ||
		dia > 31 || mes > 12 || ano > 9999)
		return null;
	switch (mes) {
		case 2:
			if (!(ano % 4) && ((ano % 100) || !(ano % 400))) {
				if (dia > 29)
					return null;
			} else {
				if (dia > 28)
					return null;
			}
			break;
		case 4:
		case 6:
		case 9:
		case 11:
			if (dia > 30)
				return null;
			break;
	}
	var sepHorario = dataComOuSemHorario.indexOf(" ");
	if (sepHorario < 0)
		sepHorario = dataComOuSemHorario.indexOf("T");
	if (sepHorario >= 0) {
		var horario = dataComOuSemHorario.substr(sepHorario + 1);
		var sepMinuto = horario.indexOf(":");
		if (sepMinuto >= 0) {
			var hora = parseInt(horario);
			var minuto = parseInt(horario.substr(sepMinuto + 1));
			if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59)
				return ano + "-" + ((mes < 10) ? ("0" + mes) : mes) + "-" + ((dia < 10) ? ("0" + dia) : dia) + "T" + ((hora < 10) ? ("0" + hora) : hora) + ":" + ((minuto < 10) ? ("0" + minuto) : minuto) + ":00";
		}
		return null;
	}
	return ano + "-" + ((mes < 10) ? ("0" + mes) : mes) + "-" + ((dia < 10) ? ("0" + dia) : dia);
}
