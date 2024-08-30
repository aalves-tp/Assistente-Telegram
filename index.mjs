// https://api.telegram.org/bot<token>/METHOD_NAME

import "dotenv/config";
import axios from "axios";
import date from "date-and-time";

import pt from "date-and-time/locale/pt";

date.locale(pt); // Switch to Spanish

const now = new Date();

let currentTime = {
  Day: date.format(new Date(), "DD"),
  WeekDay: date.format(new Date(), "dddd"),
  Month: date.format(new Date(), "MMMM"),
  Year: date.format(new Date(), "YY"),
  Hour: date.format(new Date(), "HH"),
  Minutes: date.format(new Date(), "mm"),
  Seconds: date.format(new Date(), "ss"),
};

// Load the AWS SDK for Node.js
import AWS from "aws-sdk";
// Set the region
AWS.config.update({ region: process.env.REGION });

const ScheduleTerms = [
  "-agende",
  "-marque",
  "-marca",
  "-preciso",
  "-vou",
  "-tenho que",
  "-tenho",
  "-tem",
  "-tem um",
];

const prepositions = [
  "de hoje",
  "de amanhã",
  "do mês",
  "da semana",
  "pra hoje",
  "pra amanhã",
  "pra mês",
  "pra semana",
  "para hoje",
  "para amanhã",
  "para o mês",
  "para a semana",
  "no mês",
  "pro mês",
  "para mês",
  "para semana",
  "para hoje",
  "pra semana",
  "pra amanhã",
  "pra hoje",
  "hoje",
  "amanhã",
  "semana que vem",
  "mês que vem",
  "na semana",
  "na segunda",
  "na terça",
  "na terca",
  "na quarta",
  "na quinta",
  "na sexta",
  "no sabado",
  "no sábado",
  "no domingo",
  "segunda",
  "terça",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "sábado",
  "domingo",
  "essa semana",
  "nessa semana",
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
  "em janeiro",
  "em fevereiro",
  "em março",
  "em abril",
  "em maio",
  "em junho",
  "em julho",
  "em agosto",
  "em setembro",
  "em outubro",
  "em novembro",
  "em dezembro",
];

const TimePrepositions = ["de manhã", "de tarde", "de noite", "de madrugada"];

const ReportTerms = ["-agenda", "-como tá", "-como está"];

const RemoveTerms = ["-remova", "-cancele"];

const ListTerms = ["-liste", "-adicione", "-crie", "-mostre", "-listas"];

let lastUpdate = 0;

setInterval(() => {
  currentTime = {
    Day: date.format(new Date(), "DD"),
    WeekDay: date.format(new Date(), "dddd"),
    Month: date.format(new Date(), "MMMM"),
    Year: date.format(new Date(), "YY"),
    Hour: date.format(new Date(), "HH"),
    Minutes: date.format(new Date(), "mm"),
    Seconds: date.format(new Date(), "ss"),
  };

  CheckAppointments(GetAllAppointments());

  axios
    .get(
      `https://api.telegram.org/${process.env.BOT_TOKEN}/getUpdates?&allowed_updates='message'&offset=${lastUpdate}`
    )
    .then((res) => {
      if (
        res.data.result.length > 0 &&
        lastUpdate != res.data.result[res.data.result.length - 1].update_id
      ) {
        lastUpdate = res.data.result[res.data.result.length - 1].update_id;
        HandleMessage(
          res.data.result[res.data.result.length - 1].message.text.toLowerCase()
        );
      }
    });
}, 1000);

function HandleMessage(message) {
  // Find the scheduleTerm and preposition from the message
  const scheduleTerm = ScheduleTerms.find((term) =>
    new RegExp(term, "gi").test(message)
  );
  const preposition = prepositions.find((term) =>
    new RegExp(term, "gi").test(message)
  );

  const timePrepositions = TimePrepositions.find((term) =>
    new RegExp(term, "gi").test(message)
  );

  const reportTerms = ReportTerms.find((term) =>
    new RegExp(term, "gi").test(message)
  );

  const removeTerms = RemoveTerms.find((term) =>
    new RegExp(term, "gi").test(message)
  );

  const listTerms = ListTerms.find((term) =>
    new RegExp(term, "gi").test(message)
  );

  let time = "sem horário definido";

  if (scheduleTerm && preposition) {
    // Construct regex dynamically
    const regex = new RegExp(
      `${scheduleTerm}\\s+(.*?)\\s+${preposition}`,
      "gi"
    );

    // Find matches
    const match = regex.exec(message);

    const timeRegex = /..:../gi;

    if (timePrepositions) {
      time = timePrepositions;
    } else if (timeRegex) {
      const match = message.match(timeRegex);
      if (match) {
        time = match[0]; // Assign the first match
      }
    }

    // Sending messages via Telegram API
    axios.get(
      `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Vou agendar ${match[1]} ${preposition} ${time}.`
    );
    CreateAppointment(match[1], preposition, time);
  } else if (reportTerms) {
    if (!preposition) {
      // Sending messages via Telegram API
      axios.get(
        `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Agenda:`
      );
      GetAppointments();
    } else {
      // Construct regex dynamically
      const regex = new RegExp(
        `${reportTerms}\\s+(.*?)\\s+${preposition}`,
        "gi"
      );

      const match = regex.exec(message);

      if (match != null) {
        // Sending messages via Telegram API
        axios.get(
          `https://api.telegram.org/${
            process.env.BOT_TOKEN
          }/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Agenda - ${match[0]
            .split("dia")[1]
            .slice(1, match[0].split("dia")[1].length)}:`
        );
        GetAppointmentsByDate(
          match[0].split("dia")[1].slice(1, match[0].split("dia")[1].length)
        );
      } else {
        // Sending messages via Telegram API
        axios.get(
          `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Agenda - ${preposition}:`
        );
        GetAppointmentsByDate(preposition);
      }
    }
  } else if (removeTerms) {
    RemoveAppointment(message, true);
  } else if (listTerms) {
    axios.get(
      `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Vou fazer alguma coisa com listas.`
    );
  } else {
    axios.get(
      `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Não entendi, tente de novo.`
    );
  }
}

function CreateAppointment(appointment, date, time) {
  // Create the DynamoDB service object
  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

  if (appointment.includes("dia")) {
    const appointmentSplit = appointment.split(" ");
    const newAppointment = `${appointmentSplit[appointmentSplit.length - 2]} ${
      appointmentSplit[appointmentSplit.length - 1]
    }`;

    console.log(`Atividade: ${appointment.split("dia")[0]}\n 
      Data: ${newAppointment} ${date}\n
      Hora: ${time}`);

    var params = {
      TableName: process.env.TABLE_NAME,
      Item: {
        id: { N: (Math.floor(Math.random() * 10000) + 1).toString() },
        activity: { S: appointment.split("dia")[0] },
        date: { S: `${newAppointment} ${date}` },
        time: { S: time },
      },
    };

    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function (err, data) {
      if (err) {
        console.log("Error", err);
        axios.get(
          `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Algo deu errado com o agendamento%0A%0A${err}`
        );
      } else {
        console.log("Success", data);
        // Sending messages via Telegram API
        axios.get(
          `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Agendamento criado com sucesso!.`
        );
      }
    });
  } else {
    console.log(`Atividade: ${appointment}\n 
      Data: ${date}\n
      Hora: ${time}`);

    if (new RegExp("hoje|amanha|amanhã", "gi").test(date)) {
      switch (date) {
        case "hoje":
          var params = {
            TableName: process.env.TABLE_NAME,
            Item: {
              id: { N: (Math.floor(Math.random() * 10000) + 1).toString() },
              activity: { S: appointment },
              date: {
                S: `${currentTime.Day} de ${currentTime.Month.toLowerCase()}`,
              },
              time: { S: time },
            },
          };
          break;

        case "amanha":
          var params = {
            TableName: process.env.TABLE_NAME,
            Item: {
              id: { N: (Math.floor(Math.random() * 10000) + 1).toString() },
              activity: { S: appointment },
              date: {
                S: `${(
                  parseInt(currentTime.Day) + 1
                ).toString()} de ${currentTime.Month.toLowerCase()}`,
              },
              time: { S: time },
            },
          };
          break;

        case "amanhã":
          var params = {
            TableName: process.env.TABLE_NAME,
            Item: {
              id: { N: (Math.floor(Math.random() * 10000) + 1).toString() },
              activity: { S: appointment },
              date: {
                S: `${(
                  parseInt(currentTime.Day) + 1
                ).toString()} de ${currentTime.Month.toLowerCase()}`,
              },
              time: { S: time },
            },
          };
          break;

        default:
          break;
      }
    } else {
      var params = {
        TableName: process.env.TABLE_NAME,
        Item: {
          id: { N: (Math.floor(Math.random() * 10000) + 1).toString() },
          activity: { S: appointment },
          date: { S: date },
          time: { S: time },
        },
      };
    }

    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function (err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data);
        // Sending messages via Telegram API
        axios.get(
          `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Agendamento criado com sucesso!.`
        );
      }
    });
  }
}

function GetAppointmentsByDate(prep) {
  var ddb = new AWS.DynamoDB.DocumentClient();

  if (new RegExp("semana", "gi").test(prep)) {
    (async () => {
      for (let i = 0; i < GetWeek().length; i++) {
        await GetAppointmentsByDate(GetWeek()[i].toLowerCase());
      }
    })();
  } else {
    if (new RegExp("hoje|amanha|amanhã", "gi").test(prep)) {
      switch (prep) {
        case "hoje":
          prep = `${currentTime.Day} de ${currentTime.Month.toLowerCase()}`;
          break;

        case "amanha":
          prep = `${(
            parseInt(currentTime.Day) + 1
          ).toString()} de ${currentTime.Month.toLowerCase()}`;
          break;

        case "amanhã":
          prep = `${(
            parseInt(currentTime.Day) + 1
          ).toString()} de ${currentTime.Month.toLowerCase()}`;
          break;

        default:
          break;
      }
    }

    var params = {
      TableName: process.env.TABLE_NAME,
      FilterExpression: "contains(#date, :date)",
      ExpressionAttributeNames: {
        "#date": "date",
      },
      ExpressionAttributeValues: {
        ":date": `${prep}`,
      },
    };

    ddb.scan(params, function (err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        if (data.Items.length > 0) {
          // console.log("Success", data.Items);
          let appointments = "";
          data.Items.forEach((item) => {
            appointments += `${item.id} - ${item.activity}, ${item.date}, ${item.time}%0A%0A`;
          });
          axios.get(
            `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=${appointments}`
          );
        } else {
          axios.get(
            `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Sem agendamentos em: ${prep}.`
          );
        }
      }
    });
  }
}

function GetAppointments() {
  var ddb = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: process.env.TABLE_NAME,
    FilterExpression: "#date = :date",
    ExpressionAttributeNames: {
      "#date": "date",
    },
    ExpressionAttributeValues: {
      ":date": `${currentTime.Day} de ${currentTime.Month.toLowerCase()}`,
    },
  };

  ddb.scan(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      // console.log("Success", data.Items);
      if (data.Items.length > 0) {
        let appointments = "";
        data.Items.forEach((item) => {
          appointments += `${item.id} - ${item.activity}, ${item.date}, ${item.time}%0A`;
        });
        axios.get(
          `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=${appointments}`
        );
      } else {
        axios.get(
          `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Sem agendamentos nessa data`
        );
      }
    }
  });
}

function GetLists() {}

// function GetList(list) {
//   // Create the DynamoDB service object
//   var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

//   var params = {
//     TableName: process.env.TABLE_NAME,
//     Key: {
//       id: { N: "0" },
//     },
//     ProjectionExpression: list,
//   };

//   // Call DynamoDB to read the item from the table
//   ddb.getItem(params, function (err, data) {
//     if (err) {
//       console.log("Error", err);
//     } else {
//       console.log("Success", data.Item);
//     }
//   });
// }

function GetWeek() {
  let week = [];
  const currentDay = currentTime.Day;

  switch (currentTime.WeekDay.toLowerCase()) {
    case "segunda-feira":
      for (let i = 0; i < 7; i++) {
        week.push(currentDay + i);
      }
      break;
    case "terça-feira":
      for (let i = 0; i < 7; i++) {
        week.push(currentDay - 1 + i);
      }
      break;
    case "quarta-feira":
      for (let i = 0; i < 7; i++) {
        week.push(currentDay - 2 + i);
      }
      break;
    case "quinta-feira":
      for (let i = 0; i < 7; i++) {
        week.push(currentDay - 3 + i);
      }
      break;
    case "sexta-feira":
      for (let i = 0; i < 7; i++) {
        week.push(currentDay - 4 + i);
      }
      break;
    case "sábado":
      for (let i = 0; i < 7; i++) {
        week.push(currentDay - 5 + i);
      }
      break;
    case "domingo":
      for (let i = 0; i < 7; i++) {
        week.push(currentDay - 6 + i);
      }
      break;

    default:
      break;
  }

  for (let i = 0; i < week.length; i++) {
    if (week[i] < 1) {
      if (week[i] < 0) {
        week[i] = `${
          GetMonthLength(GetMonthByID(date.format(new Date(), "M") - 1)) -
          week[i] * -1
        } de ${GetMonthByID(date.format(new Date(), "M") - 1)}`;
      } else {
        week[i] = `${GetMonthLength(
          GetMonthByID(date.format(new Date(), "M") - 1)
        )} de ${GetMonthByID(date.format(new Date(), "M") - 1)}`;
      }
    } else if (week[i] > GetMonthLength(currentTime.Month.toLowerCase())) {
      const d = week[i] - GetMonthLength(currentTime.Month.toLowerCase());

      week[i] = `${d} de ${GetMonthByID(
        parseInt(date.format(new Date(), "M")) + 1
      )}`;
    } else {
      week[i] = `${week[i]} de ${currentTime.Month.toLowerCase()}`;
    }
  }

  return week;
}

function GetMonthByID(id) {
  switch (id) {
    case 1:
      return "janeiro";
    case 2:
      return "fevereiro";
    case 3:
      return "março";
    case 4:
      return "abril";
    case 5:
      return "maio";
    case 6:
      return "junho";
    case 7:
      return "julho";
    case 8:
      return "agosto";
    case 9:
      return "setembro";
    case 10:
      return "outubro";
    case 11:
      return "novembro";
    case 12:
      return "dezembro";
    default:
      return "Mês inválido"; // Optional: Handle cases outside 1-12
  }
}

function GetMonthLength(month) {
  switch (month) {
    case "janeiro":
      return 31;
    case "fevereiro":
      if (date.isLeapYear(date.format(new Date(), "YYYY"))) {
        return 29;
      } else {
        return 28;
      }
    case "março":
      return 31;
    case "abril":
      return 30;
    case "maio":
      return 31;
    case "junho":
      return 30;
    case "julho":
      return 31;
    case "agosto":
      return 31;
    case "setembro":
      return 30;
    case "outubro":
      return 31;
    case "novembro":
      return 30;
    case "dezembro":
      return 31;
    default:
      return "Mês inválido";
  }
}

function RemoveAppointment(msg, log) {
  const numRegex = /\d+/gi;

  const num = msg.match(numRegex);

  if (log) {
    axios.get(
      `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Vou remover o agendamento ${num}`
    );
  }

  // Create the DynamoDB service object
  var ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

  var params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      id: { N: num.toString() },
    },
  };

  // Call DynamoDB to delete the item from the table
  ddb.deleteItem(params, function (err, data) {
    if (err) {
      console.log("Error", err);
      axios.get(
        `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Algo deu errado ao deletar o agendamento.%0A%0A${err}`
      );
    } else {
      console.log("Success", data);
      if (log) {
        axios.get(
          `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Agendamento removido com sucesso.`
        );
      }
    }
  });
}

function GetAllAppointments() {
  var ddb = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: process.env.TABLE_NAME,
  };

  const getAllItems = async () => {
    let items = [];
    let lastEvaluatedKey = null;

    do {
      const data = await ddb.scan(params).promise();
      items = items.concat(data.Items);
      lastEvaluatedKey = data.LastEvaluatedKey;
      params.ExclusiveStartKey = lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
  };

  getAllItems()
    .then((data) => CheckAppointments(data))
    .catch((error) => console.error("Error retrieving items:", error));
}

function CheckAppointments(appointments) {
  if (appointments && appointments.length > 0) {
    appointments.forEach((appointment) => {
      let regex = /\d/;
      if (appointment.time != undefined && regex.test(appointment.date)) {
        if (
          appointment.time.split(":")[0] == currentTime.Hour &&
          appointment.time.split(":")[1] == currentTime.Minutes &&
          appointment.date.split("de")[0].trim() == currentTime.Day
        ) {
          axios.get(
            `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Hey! Listen!%0A%0A${appointment.activity} é agora!`
          );

          RemoveAppointment(appointment.id.toString(), false);
        } else if (
          SubtractMinutes(appointment.time, 30).split(":")[0] ==
            currentTime.Hour &&
          SubtractMinutes(appointment.time, 30).split(":")[1] ==
            currentTime.Minutes &&
          currentTime.Seconds == "00" &&
          appointment.date.split("de")[0].trim() == currentTime.Day
        ) {
          axios.get(
            `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Hey! Listen!%0A%0A${appointment.activity} em meia hora!`
          );
        } else if (
          SubtractMinutes(appointment.time, 10).split(":")[0] ==
            currentTime.Hour &&
          SubtractMinutes(appointment.time, 10).split(":")[1] ==
            currentTime.Minutes &&
          currentTime.Seconds == "00" &&
          appointment.date.split("de")[0].trim() == currentTime.Day
        ) {
          axios.get(
            `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Hey! Listen!%0A%0A${appointment.activity} em 10 minutos!`
          );
        } else if (appointment.time == `de manhã` || appointment.time == `de manha`) {
          if (
            currentTime.Hour == "08" &&
            currentTime.Minutes == "00" &&
            currentTime.Seconds == "00" &&
            appointment.date.split("de")[0].trim() == currentTime.Day
          ) {
            axios.get(
              `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Hey! Listen!%0A%0A${appointment.activity} precisa ser feito agora de manhã!`
            );
          }
        } else if (appointment.time == `de tarde`) {
          if (
            currentTime.Hour == "13" &&
            currentTime.Minutes == "00" &&
            currentTime.Seconds == "00" &&
            appointment.date.split("de")[0].trim() == currentTime.Day
          ) {
            axios.get(
              `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Hey! Listen!%0A%0A${appointment.activity} precisa ser feito agora de tarde!`
            );
          }
        } else if (appointment.time == `de noite`) {
          if (
            currentTime.Hour == "19" &&
            currentTime.Minutes == "00" &&
            currentTime.Seconds == "00" &&
            appointment.date.split("de")[0].trim() == currentTime.Day
          ) {
            axios.get(
              `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Hey! Listen!%0A%0A${appointment.activity} precisa ser feito agora de noite!`
            );
          }
        }else if (appointment.time == `sem horário definido`) {
          if (
            currentTime.Hour == "08" &&
            currentTime.Minutes == "00" &&
            currentTime.Seconds == "00" &&
            appointment.date.split("de")[0].trim() == currentTime.Day
          ) {
            axios.get(
              `https://api.telegram.org/${process.env.BOT_TOKEN}/sendMessage?&chat_id=${process.env.CHAT_ID}&text=Hey! Listen!%0A%0A${appointment.activity} é hoje, e não tem horário definido!`
            );
          }
        }
      }
    });
  }
}

function SubtractMinutes(from, amount) {
  let result = 0;

  result = parseInt(from.split(":")[1]) - amount;

  if (result > 0) {
    return `${from.split(":")[0]}:${result}`;
  } else if (result < 0) {
    result = 60 - result * -1;

    return `${parseFloat(from.split(":")[0]) - 1}:${result}`;
  } else {
    return `${parseFloat(from.split(":")[0])}:00`;
  }
}
