import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';

export const plugins = [
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  new MonacoWebpackPlugin({
    languages: ['json'],
    features: ['bracketMatching', 'folding', 'find', 'hover', 'clipboard'],
    globalAPI: true,
  }),
];
