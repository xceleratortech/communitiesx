import { appRouter } from './routers';
import { createContext } from './context';
import type { Context } from './context';

// Export the app router
export { appRouter };

// Export type router type
export type AppRouter = typeof appRouter;

// Export context
export { createContext };
