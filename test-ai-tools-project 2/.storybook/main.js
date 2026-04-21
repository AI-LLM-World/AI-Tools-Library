module.exports = {
  stories: ['../packages/react-ui/src/components/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  staticDirs: ['../packages/tokens/dist'],
  framework: '@storybook/react',
}
