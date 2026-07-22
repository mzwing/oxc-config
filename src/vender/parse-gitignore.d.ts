declare module 'parse-gitignore' {
  interface GitignoreGlob {
    patterns: string[]
    type: 'ignore' | 'unignore'
  }

  interface ParsedGitignore {
    globs: () => GitignoreGlob[]
  }

  export default function parse(content: string): ParsedGitignore
}
