import { LocalStorageService } from './local-storage.service';
import { Router } from '@angular/router';
import { KrameriusApiService } from './kramerius-api.service';
import { SolrService } from './solr.service';
import { DocumentItem } from './../model/document_item.model';
import { SearchQuery } from './../search/search_query.model';
import { Injectable } from '@angular/core';
import { CollectionService } from './collection.service';
import { AppSettings } from './app-settings';
import { AnalyticsService } from './analytics.service';
import { MzModalService } from 'ngx-materialize';
import { DialogAdvancedSearchComponent } from '../dialog/dialog-advanced-search/dialog-advanced-search.component';
import { Translator } from 'angular-translator';


@Injectable()
export class SearchService {

    results: DocumentItem[] = [];
    query: SearchQuery;

    keywords: any[] = [];
    doctypes: any[] = [];
    accessibility: any[] = [];
    authors: any[] = [];
    languages: any[] = [];
    locations: any[] = [];
    geonames: any[] = [];
    collections: any[] = [];

    loading = false;

    numberOfResults: number;

    activeMobilePanel: String;

    contentType = 'grid'; // 'grid' | 'map'

    constructor(
        private router: Router,
        private translator: Translator,
        private collectionService: CollectionService,
        private solrService: SolrService,
        private analytics: AnalyticsService,
        private localStorageService: LocalStorageService,
        private krameriusApiService: KrameriusApiService,
        private appSettings: AppSettings,
        private modalService: MzModalService) {

    }

    public init(params) {
        this.results = [];
        this.keywords = [];
        this.doctypes = [];
        this.collections =[];
        this.accessibility = [];
        this.numberOfResults = 0;
        this.activeMobilePanel = 'results';
        this.query = SearchQuery.fromParams(params, this.appSettings);
        if (this.query.isBoundingBoxSet()) {
            this.contentType = 'map';
        } else {
            this.contentType = 'grid';
        }
        this.search();
    }




    public buildPlaceholderText(): string {
        const q = this.query;
        if (!q.anyFilter()) {
            return String(this.translator.instant('searchbar.main.all'));
        }
        if (q.onlyPublicFilterChecked()) {
            return String(this.translator.instant('searchbar.main.public'));
        }
        let filters = [];
        if (q.accessibility !== 'all') {
            filters.push(this.translator.instant('search.accessibility.' + q.accessibility));
        }
        for (const item of q.doctypes) {
            filters.push(this.translator.instant('model.' + item));
        }
        filters = filters.concat(q.authors);
        if (q.isYearRangeSet()) {
            filters.push(q.from + ' - ' + q.to);
        }
        filters = filters.concat(q.keywords);
        filters = filters.concat(q.geonames);
        filters = filters.concat(q.collections);
        for (const item of q.languages) {
            filters.push(this.translator.instant('language.' + item));
        }
        if (q.isCustomFieldSet()) {
            filters.push(q.getCustomValue());
        }
        for (const item of q.locations) {
            filters.push(this.translator.instant('sigla.' + item.toUpperCase()));
        }
        return this.translator.instant('searchbar.main.filters') + ' ' + filters.join(', ');
    }





    selectContentType(contentType: string) {
        this.contentType = contentType;
        if (this.contentType === 'map') {
            this.query.setBoundingBox(50.7278, 48.707, 12.7476, 18.9549);
        } else {
            this.query.clearBoundingBox();
        }
        this.reload(false);
    }


    public showAdvancedSearchDialog() {
        const options = {
            fieldType: this.query.isCustomFieldSet() ? this.query.getCustomField() : 'all',
            fieldValue: this.query.isCustomFieldSet() ? this.query.getCustomValue() : '',
        };
        this.modalService.open(DialogAdvancedSearchComponent,  options );
    }

    public reload(preservePage: boolean) {
        if (!preservePage) {
            this.query.setPage(1);
        }
        this.router.navigate(['search'],  { queryParams: this.query.toUrlParams() });
    }

    public toggleFilter(values: string[], value: string) {
        const index = values.indexOf(value);
        if (index >= 0) {
            values.splice(index, 1);
        } else {
            values.push(value);
        }
        this.reload(false);
    }

    public removeFilter(values: string[], value: string) {
        const index = values.indexOf(value);
        if (index >= 0) {
            values.splice(index, 1);
            this.reload(false);
        }
    }

    public buildK3Link(): string {
        if (this.query.getRawQ()) {
            return this.appSettings.k3 + 'Search.do?text=' + (this.query.getRawQ() || '');
        } else {
            return this.appSettings.k3 + 'Welcome.do';

        }
    }

    public setBoundingBox(north: number, south: number, west: number, east: number) {
        this.query.setBoundingBox(north, south, west, east);
        this.reload(false);
    }

    public changeOrdering(ordering: string) {
        this.analytics.sendEvent('search', 'ordering', ordering);
        this.query.setOrdering(ordering);
        this.reload(false);
    }

    public changeQueryString(query: string) {
        this.query.query = query;
        if (query) {
            this.query.setOrdering('relevance');
        }
        this.reload(false);
    }

    public removeAccessibilityFilter() {
        this.setAccessibility('all');
    }

    public setAccessibility(accessibility: string) {
        this.localStorageService.setPublicFilter(accessibility === 'public');
        this.query.setAccessibility(accessibility);
        this.reload(false);
    }

    public setYearRange(from: number, to: number) {
        this.query.setYearRange(from, to);
        this.reload(false);
    }

    public onPage(page: number) {
        this.analytics.sendEvent('search', 'paginator', page + '');
        this.setPage(page);
    }

    private setPage(page: number) {
        this.query.setPage(page);
        this.reload(true);
    }

    public nextPage() {
        this.analytics.sendEvent('search', 'paginator', 'next');
        this.query.setPage(this.query.page + 1);
        this.reload(true);
    }

    public previousPage() {
        this.analytics.sendEvent('search', 'paginator', 'previous');
        this.query.setPage(this.query.page - 1);
        this.reload(true);
    }

    public removeAllFilters() {
        this.query.removeAllFilters();
        this.reload(false);
    }

    public removeQueryString() {
        this.query.query = null;
        this.reload(false);
    }

    public removeCustomField() {
        this.query.removeCustomField();
        this.reload(false);
    }

    public getNumberOfResults(): number {
        return this.numberOfResults;
    }

    public getResultIndexFrom(): number {
        if (this.results.length === 0 || this.getNumberOfResults() === 0) {
            return 0;
        }
        return this.query.getStart() + 1;
    }


    public getResultIndexTo(): number {
        return this.query.getStart() + this.results.length;
    }

    private search() {
        this.loading = true;
        this.krameriusApiService.getSearchResults(this.query.buildQuery(null)).subscribe(response => {
            this.handleResponse(response);
            this.loading = false;
        });

    }

    public highlightDoctype(doctype: string) {
        return this.query.doctypes.length === 0 || this.query.doctypes.indexOf(doctype) >= 0;
    }

    private handleFacetResponse(response, facet) {
        switch (facet) {
            case 'accessibility': {
                this.accessibility = this.solrService.facetAccessibilityList(response);
                break;
            }
            case 'doctypes': {
                this.doctypes = this.solrService.facetDoctypeList(response, this.appSettings.joinedDoctypes, this.appSettings.doctypes);
                break;
            }
            case 'authors': {
                this.authors = this.solrService.facetList(response, SearchQuery.getSolrField('authors'), this.query['authors'], true);
                break;
            }
            case 'keywords': {
                this.keywords = this.solrService.facetList(response, SearchQuery.getSolrField('keywords'), this.query['keywords'], true);
                break;
            }
            case 'languages': {
                this.languages = this.solrService.facetList(response, SearchQuery.getSolrField('languages'), this.query['languages'], true);
                break;
            }
            case 'locations': {
                this.locations = this.solrService.facetList(response, SearchQuery.getSolrField('locations'), this.query['locations'], true);
                break;
            }
            case 'geonames': {
                this.geonames = this.solrService.facetList(response, SearchQuery.getSolrField('geonames'), this.query['geonames'], true);
                break;
            }
            case 'collections': {
                this.collections = this.solrService.facetList(response, SearchQuery.getSolrField('collections'), this.query['collections'], true);
                if (this.collectionService.ready()) {
                    this.dropEmptyCollections();
                } else {
                    this.krameriusApiService.getCollections().subscribe(
                        results => {
                            this.collectionService.assign(results);
                            this.dropEmptyCollections();
                        }
                    );
                }
                break;
            }

        }
    }

    private dropEmptyCollections() {
        const cols = [];
        for (const col of this.collections) {
            if (this.collectionService.getNameByPid(col.value) !== '-') {
                cols.push(col);
            }
        }
        this.collections = cols;
    }

    private makeFacetRequest(facet: string) {
        this.krameriusApiService.getSearchResults(this.query.buildQuery(facet)).subscribe(response => {
            this.handleFacetResponse(response, facet);
        });
    }

    private checkFacet(condition: boolean, response, facet: string) {
        if (this.appSettings.filters.indexOf(facet) < 0) {
            return;
        }
        if (condition) {
            this.handleFacetResponse(response, facet);
        } else {
            this.makeFacetRequest(facet);
        }
    }

    private handleResponse(response) {
        if (this.query.getRawQ() || this.query.isCustomFieldSet()) {
            this.numberOfResults = this.solrService.numberOfSearchResults(response);
            this.results = this.solrService.searchResultItems(response, this.query);
        } else {
            this.numberOfResults = this.solrService.numberOfResults(response);
            this.results = this.solrService.documentItems(response);
        }
        this.checkFacet(this.query.accessibility === 'all', response, 'accessibility');
        this.checkFacet(this.query.doctypes.length === 0, response, 'doctypes');
        this.checkFacet(this.query.authors.length === 0, response, 'authors');
        this.checkFacet(this.query.keywords.length === 0, response, 'keywords');
        this.checkFacet(this.query.languages.length === 0, response, 'languages');
        this.checkFacet(this.query.locations.length === 0, response, 'locations');
        this.checkFacet(this.query.geonames.length === 0, response, 'geonames');
        this.checkFacet(this.query.collections.length === 0, response, 'collections');
    }

}
