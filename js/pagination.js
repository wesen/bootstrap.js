define([], function () {
  /**
   * @class Pagination
   */
  var Pagination = function (options) {
    _.extend(this, options);
    _.defaults(this, Pagination.prototype.defaults);
  };

  function constrain(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  _.extend(Pagination.prototype, /** @lends Pagination */ {
    defaults: {
      currentPage: 1,
      perPage: 10,
      maxPerPage: 300,
      perPageOptions: ["Default", 10, 20, 50, "All"],
      perPageDefault: 10
    },

    paginate: function (total) {
      this.itemTotal = total;
      this.itemCount = this.perPage;

      if (this.perPage === "Default") {
        this.itemCount = this.perPageDefault;
      } else if (this.perPage === "All") {
        this.itemCount = Math.min(this.maxPerPage, this.itemTotal);
      } else if (this.perPage != 0) {
        this.itemCount = this.perPage;
      }

      if (this.itemTotal < this.itemCount) {
        this.itemCount = total;
      }

      if (this.itemCount === "") {
        /* default value */
        this.itemCount = 10;
      }

      if (this.itemCount > 0) {
        this.itemPagesCount = Math.ceil(this.itemTotal / this.itemCount);
      } else {
        this.itemPagesCount = 0;
      }

      this.currentPage = constrain(this.currentPage, 1, this.itemPagesCount);
      this.itemMin = ((this.currentPage - 1) * this.itemCount);
      this.itemMax = this.itemMin + this.itemCount;


      return {
        itemMin: this.itemMin,
        itemMax: this.itemMax
      };
    },

    groupPages: function () {
      var pages = [];

      var n = this.itemPagesCount - 1;
      var i = constrain(this.currentPage - 1, 0, n);

      if (this.itemPagesCount > 9) {
      /*
        | i  | seq                                     |
        | 0  | *0*  1   2   3  ...   n3   n2   n1   n  |
        | 1  |  0  *1*  2   3  ...   n3   n2   n1   n  |
        | 2  |  0   1  *2*  3  ...   n3   n2   n1   n  |
        | 3  |  0   1   2  *3*  4   ...   n2   n1   n  |
        | 4  |  0   1   2   3  *4*   5   ...   n1   n  |
        | 5  |  0   1  ...  4  *5*   6   ...   n1   n  |
        | n  |  0   1   2   3  ...   n3   n2   n1  *n* |
        | n1 |  0   1   2   3  ...   n3   n2  *n1*  n  |
        | n2 |  0   1   2   3  ...   n3  *n2*  n1   n  |
        | n3 |  0   1   2  ...  n4  *n3*  n2   n1   n  |
        | n4 |  0   1  ...  n5 *n4*  n3   n2   n1   n  |
        | n5 |  0   1  ...  n6 *n5*  n4  ...   n1   n  |
      */

        var firstPage = 0;
        var firstEndPage = 1;
        var thirdPage = n - 1;
        var secondPage = 0;
        var secondEndPage = 0;
        var page = {};

        if (i <= 4) {
          /* n = 0 .. 4 */
          firstEndPage = Math.max(i + 1, 3);
          secondPage = Math.max(n - 3, n - (5 - i));
          secondEndPage = n;
          thirdPage = n; // disable
        } else if (i >= (n - 4)) {
          /* n = n5 .. n */
          secondPage = Math.min(n - 3, i - 1);
          secondEndPage = n;
          thirdPage = n; // disable
          firstEndPage = Math.min(3, 5 - (n - i));
        } else {
          secondPage = i - 1;
          secondEndPage = i + 1;
        }

        for (var j = firstPage; j <= firstEndPage; j++) {
          page = {
            num: j + 1,
            isDisabled: j == i
          };
          pages.push(page);
        }
        if (firstEndPage != secondPage) {
          page = {
            isPlaceHolder: true
          };
          pages.push(page);
        }

        for (j = secondPage; j <= secondEndPage; j++) {
          page = {
            num: j + 1,
            isDisabled: j == i
          };
          pages.push(page);
        }

        if (secondEndPage != thirdPage) {
          page = {
            isPlaceHolder: true
          };
          pages.push(page);

          for (j = thirdPage; j <= n; j++) {
            page = {
              num: j + 1,
              isDisabled: j == i
            };
            pages.push(page);
          }
        }
      } else {
        for (j = 0; j < this.itemPagesCount; j++) {
          page = {
            num: j + 1,
            isDisabled: j == i
          };
          pages.push(page);
        }
      }

      return pages;
    },

    toJSON: function () {
      var pages = this.groupPages();
      for (var i = 0; i < pages.length; i++) {
        if (pages[i].num == this.currentPage) {
          pages[i].isSelected = true;
        }
      }

      return {
        hasPrevious: this.currentPage > 1,
        hasHits: this.itemTotal > 0,
        currentPage: this.currentPage,
        hasNext: this.currentPage < this.itemPagesCount,
        nextPage: this.currentPage + 1,
        prevPage: this.currentPage - 1,
        pageCount: this.itemPagesCount,
        itemMinInc: this.itemMin + 1,
        itemMin: this.itemMin,
        itemMax: this.itemMax,
        itemCount: this.itemCount,
        itemTotal: this.itemTotal,
        perPage: this.perPage,
        pages: pages
      };
    }
  });


  return Pagination;
});