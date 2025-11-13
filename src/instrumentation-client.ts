// // This file configures the initialization of Sentry on the client.
// // The added config here will be used whenever a users loads a page in their browser.
// // https://docs.sentry.io/platforms/javascript/guides/nextjs/

// import * as Sentry from '@sentry/nextjs';

// Sentry.init({
//     dsn: 'https://8b5b8ee749e9dc12569da5054d997e48@sentry.xcelerator.co.in/14',

//     // Add optional integrations for additional features
//     integrations: [
//         // Note: replayIntegration may not be available in this version of Sentry
//         // Remove or comment out if causing build issues
//     ],

//     // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
//     tracesSampleRate: 1,
//     // Enable logs to be sent to Sentry
//     enableLogs: true,

//     // Define how likely Replay events are sampled.
//     // This sets the sample rate to be 10%. You may want this to be 100% while
//     // in development and sample at a lower rate in production
//     replaysSessionSampleRate: 0.1,

//     // Define how likely Replay events are sampled when an error occurs.
//     replaysOnErrorSampleRate: 1.0,

//     // Setting this option to true will print useful information to the console while you're setting up Sentry.
//     debug: false,
// });

// // Note: captureRouterTransitionStart may not be available in this version of Sentry
// // export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
