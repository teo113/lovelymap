# lovelymap
A simple JavaScript web mapping app.

Readme contents:

01 - objective

02 - minimum functionality

03 - suggested technologies & structure

04 - development plan

######################################

01 - **objective**:

*lovelymap* is a simple, lightweight JavaScript map for visualising geospatial data sourced from an SQL RDBS. It can be used on mobile or desktop broswer either as standalone web page or embedded within an existing site.

02 - **minimum functionality**:
* option to publish privately for internal use **and** publically for external consumption
* built on open source technology where possible
* ability to read and visualise tables from PostgreSQL
* ability to apply simple styling to map layers
* ability to render WMS/WMTS basemaps
* map legend with simple layer toggle on/off
* credentials to be inaccessible to end user
* embeddable map frame
* compatible with EPSG:27700 and/or EPSG:3857 projections

03 - **suggested technologies & structure**:
* html + JavaScript + (css if required)
* Flask or Django for web framework?
* PostgreSQL tables as data source
* map layers rendered as GeoJson? WKTs?
* for simplicity, bypass use of serving PostgreSQL via GeoServer
