var RedTomato = function(){
    var element, vm, fields;
    fields = [
        new RedTomato.Field('All metadata fields', 'am_metadata.*', 1.0),
        new RedTomato.Field('Keywords', 'am_metadata.Keywords.searchable', 1.0),
        new RedTomato.Field('Title', 'am_metadata.Title.searchable', 1.0),
        new RedTomato.Field('Description', 'am_metadata.Asset Description', 1.0),
        new RedTomato.Field('Asset ID', 'AmAsset.id', 1.0),
        new RedTomato.Field('File Name', 'AmAsset.original_filename.searchable', 1.0),
        new RedTomato.Field('SHA1 Hash', 'AmAsset.sha_hash_file', 1.0),
        new RedTomato.Field('Asset Tags', 'tags.searchable', 1.0)
    ];
    vm = new RedTomato.VM('red tomato', fields, 'http://i.walmart-production-escluster.realtimeprocess.net:9200/');

    ko.bindingHandlers.slider = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            $(element).slider({
                    min    : 0.0,
                    max    : 20.0,
                    step   : 0.10,
                    value  : viewModel.boost(),
                    change : function(event, ui){
                        viewModel.boost(ui.value);
                    }
            });
        }
    };

    ko.bindingHandlers.showHideResults = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            console.log('init');
            console.log('viewModel', viewModel);
        },
        change: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var $el;
            console.log('valueAccessor', valueAccessor);
            console.log('viewModel', viewModel);
            $el = $(element);
            if (viewModel()) {
                $el.fadeIn();
            } else {
                $el.fadeOut();
            }
        }
    };

    element = document.getElementById('main');
    $(element).find('table').on('click', 'img', function(){
        var url;
        url = vm.client.hostPort() + '/entities/amasset/' + ko.dataFor(this)._source.AmAsset.id + '?fields=AmAsset.original_filename,am_metadata';
        window.open(url);
    });

    ko.applyBindings(vm, element);

};

RedTomato.VM = function(mainKeyword, fields, elasticHostPort){
    this.mainKeyword    = ko.observable(mainKeyword);
    this.requestedSize  = ko.observable(40);
    this.phraseField    = new RedTomato.Field('Phrase Match', '', 1.5);
    this.minScoreField  = new RedTomato.Field('Minimum Score', '', 0.1);
    this.fields         = ko.observableArray(fields);
    this.autoUpdate     = ko.observable(false);
    this.totalHits      = ko.observable(0);
    this.results        = ko.observableArray();
    this.client         = new RedTomato.ElasticSearchClient(elasticHostPort);
    this.selectedResult = ko.observable(null);
};

RedTomato.VM.prototype.buildQuery = function(){
    var fields, queryFields;
    fields= this.fields();
    queryFields = fields.map(function(field){
        return field.toBoostString();
    });
    phraseQueryFields = [
        'am_metadata.Asset Description'
    ];
    return {
        query: {
            filtered: {
                query: {
                    bool: {
                        should: [
                            {
                                query_string: {
                                    query   : this.mainKeyword(),
                                    lenient : true,
                                    fields  : queryFields,
                                    boost   : 1
                                }
                            },
                            {
                                multi_match: {
                                    query   : this.mainKeyword(),
                                    fields  : phraseQueryFields,
                                    type    : 'phrase',
                                    boost   : this.phraseField.boost()
                                }
                            }
                        ],
                        minimum_should_match: 1,
                        disable_coord: true
                    }
                },
                filter: {
                    match_all: {}
                }
            }
        },
        size: this.requestedSize(),
        min_score: this.minScoreField.boost(),
        sort: {
            '_score': {
                order: 'desc'
            }
        },
        explain: true
    };
};

RedTomato.VM.prototype.submitQuery = function(){
    var self;
    self = this;
    this.client.submitSearch('walmart_entities/amasset', this.buildQuery(), function(data){
        self.processResults(data);
    });
};

RedTomato.VM.prototype.processResults = function(data){
    this.results(data.hits.hits);
    this.totalHits(data.hits.total);
};

RedTomato.Field = function(name, path, boost){
    this.name         = name;
    this.path         = path;
    this.boost        = ko.observable(boost);
};

RedTomato.Field.prototype.toBoostString = function(){
    return this.path + '^' + this.boost().toFixed(1);;
};

RedTomato.ElasticSearchClient = function(hostPort){
    this.hostPort = ko.observable(hostPort);
    this.xhr      = ko.observable(null);
};
RedTomato.ElasticSearchClient.prototype.submitSearch = function(searchPath, query, callback){
    var self, url, xhr;
    self = this;
    url = [this.hostPort(), searchPath, '_search'].join('/');
    xhr = $.ajax({
            url         : "/red_tomato_ko/app/elastic_proxy.php",
            type        : 'POST',
            crossDomain : true,
            data        : { url: url, data: query },
            dataType    : 'json',
            success     : function(data){
                self.xhr(null);
                callback.call(null, data);
            }
    });
    this.xhr(xhr);
};

RedTomato();
