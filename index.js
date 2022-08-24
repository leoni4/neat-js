// eslint-disable-next-line no-undef,@typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line no-undef,@typescript-eslint/no-var-requires
const path = require('path');
const app = express();
const port = 3000;
app.use(express.static('dist'));
app.get('/', (req, res) => {
    // eslint-disable-next-line no-undef
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
