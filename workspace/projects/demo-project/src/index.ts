/**
 * Demo entry point for the Local Workspace Cockpit sample project.
 */

export function greet(name: string): string {
  return `Hello, ${name}! Welcome to your local AI workspace.`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(greet("Operator"));
}
