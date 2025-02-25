/*!
 * SuperGenPass library
 * https://github.com/chriszarate/supergenpass-lib
 * https://chriszarate.github.com/supergenpass/
 * License: GPLv2
 */

import tldList from './tld-list'

// Remove subdomains while respecting a number of secondary ccTLDs.
function removeSubdomains (hostname) {
  const hostnameParts = hostname.split('.')

  // A hostname with less than three parts is as short as it will get.
  if (hostnameParts.length < 2) {
    return hostname
  }

  // Try to find a match in the list of ccTLDs.
  const ccTld = tldList.find(part => hostname.endsWith(`.${part}`))
  if (ccTld) {
    // Get one extra part from the hostname.
    const partCount = ccTld.split('.').length + 1
    return hostnameParts.slice(0 - partCount).join('.')
  }

  // If no ccTLDs were matched, return the final two parts of the hostname.
  return hostnameParts.slice(-2).join('.')
}

// Isolate the domain name of a URL.
function getHostname (url, userOptions = {}) {
  const defaults = {
    removeSubdomains: true
  }
  const options = Object.assign({}, defaults, userOptions)
  // Remove query string if present
  const urlWithoutQuery = url.split('?')[0]
  const domainRegExp = /^(?:[a-z]+:\/\/)?(?:[^/@]+@)?([^/:]+)/i
  const ipAddressRegExp = /^\d{1,3}\.\d{1,3}.\d{1,3}\.\d{1,3}$/
  const domainMatch = urlWithoutQuery.match(domainRegExp)

  if (domainMatch === null) {
    throw new Error(`URL is invalid: ${url}`)
  }

  // If the hostname is an IP address, no further processing can be done.
  const hostname = domainMatch[1]
  if (ipAddressRegExp.test(hostname)) {
    return hostname
  }

  // Return the hostname with subdomains removed, if requested.
  return (options.removeSubdomains) ? removeSubdomains(hostname) : hostname
}

export default getHostname
