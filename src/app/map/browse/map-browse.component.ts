import { Component, OnInit } from '@angular/core';
import { LatLngBounds } from '@agm/core';
import { DomSanitizer } from '@angular/platform-browser';
import { KrameriusApiService } from '../../services/kramerius-api.service';
import { SearchService } from '../../services/search.service';
import { DocumentItem } from '../../model/document_item.model';

@Component({
  selector: 'app-map-browse',
  templateUrl: './map-browse.component.html',
  styleUrls: ['./map-browse.component.scss']
})
export class MapBrowseComponent implements OnInit {

  lat = 49.206902;
  lng = 16.595591;
  zoom = 9;

  bounds: LatLngBounds;

  focusedItem: DocumentItem;

  constructor(private api: KrameriusApiService, public searchService: SearchService, private _sanitizer: DomSanitizer) { }

  ngOnInit() {
  }

  onBoundsChange(bounds: LatLngBounds) {
    this.bounds = bounds;
  }

  onIdle() {
    this.reload();
  }

  reload() {
    const north = this.bounds.getNorthEast().lat();
    const south = this.bounds.getSouthWest().lat();
    const east = this.bounds.getNorthEast().lng();
    const west = this.bounds.getSouthWest().lng();
    this.searchService.setBoundingBox(north, south, west, east);
  }

  thumb(uuid: string) {
    return this._sanitizer.bypassSecurityTrustStyle(`url(${this.api.getThumbUrl(uuid)})`);
  }

}
