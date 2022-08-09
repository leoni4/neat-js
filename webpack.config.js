/* eslint-disable no-undef,@typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
    mode: 'production',

    devtool: 'source-map',

    entry: './src/index.ts',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js',
        globalObject: 'this',
        library: {
            name: 'NeatJS',
            type: 'umd',
        },
    },

    resolve: {
        extensions: ['.ts', '.js'],
    },

    module: {
        rules: [
            {
                test: /\.tsx?/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },

    watch: true,
};
