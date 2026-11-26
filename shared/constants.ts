const githubRepo = 'Rentgen-io/Rentgen';
const githubUrl = `https://github.com/${githubRepo}`;

export const appConfig = {
  origin: 'https://rentgen.io',
  domain: 'rentgen.io',
  github: {
    url: githubUrl,
    newIssueUrl: `${githubUrl}/issues/new`,
    wikiUrl: `${githubUrl}/wiki`,
    latestReleaseApiUrl: `https://api.github.com/repos/${githubRepo}/releases/latest`,
  },
};
