#!/usr/bin/env nodejs

const config = require('./config')
const request = require('request')
const trello = require('trello')

const trlo = new trello(config.trello.key, config.trello.token)

// authenticate with TeamGantt
request(
  {
    method: 'POST',
    url: 'https://api.teamgantt.com/v1/authenticate',
    headers: {
      'Content-Type': 'application/json',
      'TG-Authorization': `Bearer ${config.teamgantt.bearer}`
    },
    body: `{ "user": "${config.teamgantt.username}",  "pass": "${
      config.teamgantt.password
    }" }`
  },
  (error, response, body) => {
    // parse auth keys
    const authData = JSON.parse(body)

    // fetch all open tasks from TeamGantt
    request(
      {
        method: 'GET',
        url: 'https://api.teamgantt.com/v1/tasks?hide_completed=true',
        headers: {
          'Content-Type': 'application/json',
          'TG-Authorization': `Bearer ${config.teamgantt.bearer}`,
          'TG-Api-Key': authData.api_key,
          'TG-User-Token': authData.user_token
        }
      },
      (error, response, body) => {
        const tasks = JSON.parse(body)

        // delete all trello cards in list
        // create Trello card
        trlo
          .makeRequest('post', `/1/lists/${config.trello.list}/archiveAllCards`)
          .then(res => {
            console.log('Archived cards')

            // loop through TeamGantt tasks
            tasks.forEach(task => {
              // ignore tasks with no end date or no resources
              if (!task.end_date || !task.resources.length) {
                return
              }

              // loop over resources and create comma separated list of Trello member IDs
              let members = ''
              task.resources.forEach(resource => {
                // loop through members array until we find this one
                config.members.every(member => {
                  // found a match so add to comma separated string and end loop
                  if (member.name === resource.name) {
                    members += `${member.id},`
                    return false
                  }

                  return true
                })
              })

              // format date for Trello
              const dateParts = task.end_date.split('-')
              const formattedDate = `${dateParts[1]}/${dateParts[2]}/${
                dateParts[0]
              }`

              // create Trello card
              trlo
                .makeRequest('post', '/1/cards', {
                  name: `${task.project_name} - ${task.name}`,
                  idList: config.trello.list,
                  due: formattedDate,
                  idMembers: members.slice(0, -1)
                })
                .then(res => {
                  // success so log info to console
                  console.log('Card added')
                  console.log(`Project: ${task.project_name}`)
                  console.log(`Task: ${task.name}`)
                  console.log(`Due Date: ${formattedDate}\r\n`)
                })
                .catch(err => {
                  console.log(err)
                })
            })
          })
          .catch(err => {
            console.log(err)
          })
      }
    )
  }
)
