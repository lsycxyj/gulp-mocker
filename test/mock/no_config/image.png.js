module.exports = async function ({ ctx, helpers }) {
    const { genImageResponse, mergeParams } = helpers;
    return await genImageResponse(mergeParams(ctx));
};
