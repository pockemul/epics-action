const core = require('@actions/core');
const github = require('@actions/github');

async function getReferencedEpics({ octokit }) {
  const epicLabelName = core.getInput('epic-label-name', { required: true });

	console.log('epic label',epicLabelName);

  const events = await octokit.issues.listEventsForTimeline({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: github.context.payload.issue.number,
    per_page: '1000',
  });

	console.log('events',events);
  const referencedEpics = events.data
    .filter((item) => (item.event === 'cross-referenced' && item.source))
    .filter((item) => item.source.issue.labels
      .filter((label) => label.name.toLowerCase() === epicLabelName.toLowerCase()).length > 0);

  return referencedEpics;
}

async function updateEpic({ octokit, epic }) {
  const issueNumber = github.context.payload.issue.number;
  const issueState = github.context.payload.issue.state;
  const issueTitle = github.context.payload.issue.title;
  const convertedIssueState = issueState === 'closed' ? 'x' : ' ';
  const epicNumber = epic.source.issue.number;
  let epicBody = epic.source.issue.body;

  const pattern = new RegExp(`- \\[[ |x]\\] .*#${issueNumber}.*`, 'gm');
  const matches = epicBody.matchAll(pattern);

    console.log('OK1');
  // eslint-disable-next-line no-restricted-syntax
  for (const match of matches) {
	console.log('match1',match[0]);
    epicBody = epicBody.replace(match[0], match[0].replace(/- \[[ |x]\]/, `- [${convertedIssueState}] toto`));
  }
 
  // replace #xxx () by #xxx (title)
  const pattern_title = new RegExp(`#${issueNumber} \\(.*\\).*`, 'gm');
  const matches_title = epicBody.matchAll(pattern_title);

    console.log('OK2');
  // eslint-disable-next-line no-restricted-syntax
  for (const match of matches_title) {
    console.log('Hello',match[0]);
    epicBody = epicBody.replace(match[0], match[0].replace(/ \(.*\)/, ` (${issueTitle})`));
  }
  
  const result = await octokit.issues.update({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: epicNumber,
    body: epicBody,
  });

  return result;
}

async function updateEpics({ octokit, epics }) {
	
    console.log('START REMY 3');
  return Promise.all(epics.map((epic) => updateEpic({ octokit, epic })));
}

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });

    const octokit = new github.GitHub(token, {
      previews: ['mockingbird-preview'],
    });


    console.log('START REMY');
    const epics = await getReferencedEpics({ octokit });
	
    console.log('START REMY 2',epics);
    await updateEpics({ octokit, epics });
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run();
