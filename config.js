module.exports = {
    port: 3000,
    requestInterval: 2000, // in milliseconds
    domainBlacklist: [
        'example.com',
        'blocked-domain.com'
    ],
    domainWhitelist: [
        'github.com',
        'google.com',
        'allowed-domain.com'
    ]
};
